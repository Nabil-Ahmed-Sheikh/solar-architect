from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from projects.models import Project
from .models import EnergyReport, MonthlyGeneration


def make_user(username="reportuser", password="Pass123!", email="report@example.com"):
    return User.objects.create_user(username=username, password=password, email=email)


def make_project(owner=None):
    return Project.objects.create(owner=owner, name="Report Project", location="Edmonton, AB")


def make_report(project, year=2025, **kwargs):
    defaults = {
        "total_generation_kwh": 12000,
        "total_consumption_kwh": 10000,
        "net_export_kwh": 2000,
        "co2_avoided_kg": 5400,
        "savings_usd": 2160,
        "performance_ratio": 0.80,
        "capacity_factor": 15.5,
    }
    defaults.update(kwargs)
    return EnergyReport.objects.create(project=project, report_year=year, **defaults)


class EnergyReportListCreateTests(APITestCase):
    url = "/api/reports/"

    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.client.force_authenticate(user=self.user)

    def test_list_empty(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_create_report(self):
        res = self.client.post(self.url, {
            "project": self.project.id,
            "report_year": 2024,
            "total_generation_kwh": 11500,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EnergyReport.objects.count(), 1)

    def test_filter_by_project(self):
        p2 = Project.objects.create(owner=self.user, name="P2", location="Calgary")
        make_report(self.project, year=2025)
        make_report(p2, year=2025)
        res = self.client.get(self.url, {"project": self.project.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_filter_by_year(self):
        make_report(self.project, year=2024)
        make_report(self.project, year=2023, total_generation_kwh=9000)
        res = self.client.get(self.url, {"year": 2024})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["report_year"], 2024)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class EnergyReportDetailTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.report = make_report(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/reports/{self.report.id}/"

    def test_get_report(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["report_year"], 2025)
        self.assertIn("monthly_data", res.data)

    def test_patch_report(self):
        res = self.client.patch(self.url, {"total_generation_kwh": 13000})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(float(res.data["total_generation_kwh"]), 13000.0)

    def test_delete_report(self):
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(EnergyReport.objects.count(), 0)

    def test_get_nonexistent(self):
        res = self.client.get("/api/reports/99999/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class AddMonthlyDataTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.report = make_report(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/reports/{self.report.id}/add_monthly_data/"

    def _monthly_payload(self):
        return [
            {"month": m, "generation_kwh": 1000, "consumption_kwh": 800, "irradiance_kwh_m2": 120, "peak_power_kw": 5.0}
            for m in range(1, 13)
        ]

    def test_add_monthly_data(self):
        res = self.client.post(self.url, self._monthly_payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MonthlyGeneration.objects.filter(report=self.report).count(), 12)

    def test_add_monthly_data_replaces_existing(self):
        MonthlyGeneration.objects.create(report=self.report, month=1, generation_kwh=500)
        payload = [{"month": 1, "generation_kwh": 999, "consumption_kwh": 0, "irradiance_kwh_m2": 0, "peak_power_kw": 0}]
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        row = MonthlyGeneration.objects.get(report=self.report, month=1)
        self.assertAlmostEqual(row.generation_kwh, 999.0)

    def test_add_monthly_data_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.post(self.url, self._monthly_payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ReportSummaryTests(APITestCase):
    url = "/api/reports/summary/"

    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.client.force_authenticate(user=self.user)

    def test_summary_no_data(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("total_kwh", res.data)

    def test_summary_aggregates_correctly(self):
        make_report(self.project, year=2024, total_generation_kwh=10000, savings_usd=1800, co2_avoided_kg=4500)
        make_report(self.project, year=2023, total_generation_kwh=9000, savings_usd=1620, co2_avoided_kg=4050)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(float(res.data["total_kwh"]), 19000.0)
        self.assertAlmostEqual(float(res.data["total_savings"]), 3420.0)

    def test_summary_excludes_other_users_data(self):
        """Summary must only aggregate the current user's reports."""
        user_b = User.objects.create_user(username="report_b", email="rb@example.com", password="Pass123!")
        project_b = make_project(owner=user_b)
        make_report(self.project, year=2025, total_generation_kwh=5000, savings_usd=900, co2_avoided_kg=2250)
        make_report(project_b, year=2025, total_generation_kwh=99999, savings_usd=99999, co2_avoided_kg=99999)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(float(res.data["total_kwh"]), 5000.0)


class ReportIsolationTests(APITestCase):
    """User A cannot see or modify User B's reports."""

    def setUp(self):
        self.user_a = make_user(username="rep_a", email="rep_a@example.com")
        self.user_b = make_user(username="rep_b", email="rep_b@example.com")
        self.project_a = make_project(owner=self.user_a)
        self.report_a = make_report(self.project_a, year=2025)

    def test_list_returns_only_own_reports(self):
        self.client.force_authenticate(user=self.user_b)
        res = self.client.get("/api/reports/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_get_other_users_report_returns_404(self):
        self.client.force_authenticate(user=self.user_b)
        res = self.client.get(f"/api/reports/{self.report_a.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_monthly_data_to_other_users_report_returns_404(self):
        self.client.force_authenticate(user=self.user_b)
        res = self.client.post(
            f"/api/reports/{self.report_a.id}/add_monthly_data/",
            [{"month": 1, "generation_kwh": 800}],
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
