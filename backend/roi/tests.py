from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from projects.models import Project
from .models import ROIAnalysis, YearlyProjection


def make_user(username="roiuser", password="Pass123!", email="roi@example.com"):
    return User.objects.create_user(username=username, password=password, email=email)


def make_project(owner=None):
    return Project.objects.create(owner=owner, name="ROI Project", location="Edmonton, AB")


def make_roi(project, **kwargs):
    defaults = {
        "system_size_kwp": 10.0,
        "system_cost_usd": 35000,
        "annual_production_kwh": 12000,
        "federal_itc_pct": 30,
        "current_utility_rate_kwh": 0.18,
    }
    defaults.update(kwargs)
    analysis = ROIAnalysis.objects.create(project=project, **defaults)
    analysis.calculate()
    return analysis


QUICK_ESTIMATE_PAYLOAD = {
    "system_size_kwp": 10,
    "system_cost_usd": 35000,
    "annual_production_kwh": 12000,
    "panel_degradation_pct": 0.5,
    "federal_itc_pct": 30,
    "provincial_rebate_usd": 0,
    "srec_revenue_annual_usd": 0,
    "loan_amount_usd": 0,
    "loan_interest_rate_pct": 5.5,
    "loan_term_years": 20,
    "current_utility_rate_kwh": 0.18,
    "utility_inflation_rate_pct": 3.5,
    "net_metering_rate_kwh": 0.10,
    "annual_om_cost_usd": 200,
}


class ROIListCreateTests(APITestCase):
    url = "/api/roi/analyses/"

    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.client.force_authenticate(user=self.user)

    def test_list_empty(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_create_analysis(self):
        res = self.client.post(self.url, {
            "project": self.project.id,
            "name": "Base Case",
            "system_size_kwp": 10.0,
            "system_cost_usd": 35000,
            "annual_production_kwh": 12000,
            "current_utility_rate_kwh": 0.18,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ROIAnalysis.objects.count(), 1)
        # Confirm calculate() ran and populated outputs
        analysis = ROIAnalysis.objects.first()
        self.assertGreater(analysis.net_system_cost_usd, 0)

    def test_filter_by_project(self):
        p2 = Project.objects.create(owner=self.user, name="P2", location="Calgary")
        make_roi(self.project)
        make_roi(p2)
        res = self.client.get(self.url, {"project": self.project.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ROIDetailTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.analysis = make_roi(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/roi/analyses/{self.analysis.id}/"

    def test_get_analysis(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("payback_years", res.data)
        self.assertIn("npv_usd", res.data)
        self.assertIn("irr_pct", res.data)
        self.assertIn("yearly_projections", res.data)
        self.assertEqual(len(res.data["yearly_projections"]), 25)

    def test_patch_analysis(self):
        res = self.client.patch(self.url, {"name": "Updated Analysis"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Updated Analysis")

    def test_delete_analysis(self):
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ROIAnalysis.objects.count(), 0)

    def test_get_nonexistent(self):
        res = self.client.get("/api/roi/analyses/99999/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class ROIRecalculateTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.analysis = make_roi(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/roi/analyses/{self.analysis.id}/recalculate/"

    def test_recalculate_changes_outputs(self):
        original_payback = self.analysis.payback_years
        res = self.client.post(self.url, {
            "current_utility_rate_kwh": 0.30,
            "federal_itc_pct": 30,
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("payback_years", res.data)
        # Higher utility rate should yield a faster payback
        self.assertLess(float(res.data["payback_years"]), original_payback)

    def test_recalculate_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.post(self.url, {"current_utility_rate_kwh": 0.20})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ROIQuickEstimateTests(APITestCase):
    url = "/api/roi/analyses/quick_estimate/"

    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_quick_estimate_returns_financials(self):
        res = self.client.post(self.url, QUICK_ESTIMATE_PAYLOAD)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("net_system_cost_usd", res.data)
        self.assertIn("payback_years", res.data)
        self.assertIn("irr_pct", res.data)
        self.assertIn("npv_usd", res.data)
        self.assertIn("lcoe_per_kwh", res.data)
        self.assertIn("lifetime_savings_usd", res.data)

    def test_quick_estimate_uses_defaults(self):
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("payback_years", res.data)

    def test_quick_estimate_net_cost_reflects_itc(self):
        # With 30% ITC, net cost should be 70% of system cost (with no rebate or loan)
        res = self.client.post(self.url, QUICK_ESTIMATE_PAYLOAD)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        expected_net = 35000 * (1 - 0.30)
        self.assertAlmostEqual(float(res.data["net_system_cost_usd"]), expected_net, delta=1)

    def test_quick_estimate_does_not_persist(self):
        self.client.post(self.url, QUICK_ESTIMATE_PAYLOAD)
        self.assertEqual(ROIAnalysis.objects.count(), 0)

    def test_quick_estimate_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.post(self.url, QUICK_ESTIMATE_PAYLOAD)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ROIIsolationTests(APITestCase):
    """User A cannot see or modify User B's ROI analyses."""

    def setUp(self):
        self.user_a = make_user(username="roi_a", email="roi_a@example.com")
        self.user_b = make_user(username="roi_b", email="roi_b@example.com")
        self.project_a = make_project(owner=self.user_a)
        self.analysis_a = make_roi(self.project_a)

    def test_list_returns_only_own_analyses(self):
        self.client.force_authenticate(user=self.user_b)
        res = self.client.get("/api/roi/analyses/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_get_other_users_analysis_returns_404(self):
        self.client.force_authenticate(user=self.user_b)
        res = self.client.get(f"/api/roi/analyses/{self.analysis_a.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_recalculate_other_users_analysis_returns_404(self):
        self.client.force_authenticate(user=self.user_b)
        res = self.client.post(f"/api/roi/analyses/{self.analysis_a.id}/recalculate/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
