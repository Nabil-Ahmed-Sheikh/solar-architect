from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Project, GlobalMetrics


def make_user(username="owner", password="Pass123!", email="owner@example.com"):
    return User.objects.create_user(username=username, password=password, email=email)


def make_project(owner=None, name="Test Project", location="Edmonton, AB", **kwargs):
    return Project.objects.create(owner=owner, name=name, location=location, **kwargs)


class ProjectListCreateTests(APITestCase):
    url = "/api/projects/"

    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_list_projects_empty(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_create_project(self):
        res = self.client.post(self.url, {"name": "New Project", "location": "Calgary, AB"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "New Project")
        self.assertEqual(Project.objects.count(), 1)

    def test_create_project_missing_fields(self):
        res = self.client.post(self.url, {"name": "No Location"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_with_status_filter(self):
        make_project(owner=self.user, status="ACTIVE")
        make_project(owner=self.user, name="Pending Project", location="Red Deer, AB", status="PENDING")
        res = self.client.get(self.url, {"status": "ACTIVE"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["status"], "ACTIVE")

    def test_list_with_search_filter(self):
        make_project(owner=self.user, name="Solar Farm Alpha")
        make_project(owner=self.user, name="Wind Project Beta", location="Lethbridge, AB")
        res = self.client.get(self.url, {"search": "Alpha"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ProjectDetailTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user, status="ACTIVE", roof_area=120.5, estimated_generation=18.3)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/projects/{self.project.id}/"

    def test_get_project(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Test Project")
        self.assertEqual(res.data["status"], "ACTIVE")

    def test_patch_project(self):
        res = self.client.patch(self.url, {"name": "Updated Name", "status": "COMPLETED"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Updated Name")
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "COMPLETED")

    def test_delete_project(self):
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Project.objects.count(), 0)

    def test_get_nonexistent_project(self):
        res = self.client.get("/api/projects/99999/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class ProjectStatsTests(APITestCase):
    url = "/api/projects/stats/"

    def setUp(self):
        self.user = make_user()
        make_project(owner=self.user, status="ACTIVE", roof_area=100, estimated_generation=15)
        make_project(owner=self.user, name="P2", location="Calgary", status="PENDING", roof_area=80, estimated_generation=12)
        self.client.force_authenticate(user=self.user)

    def test_stats_shape(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("total_projects", res.data)
        self.assertIn("active_installations", res.data)
        self.assertIn("total_estimated_generation_mwh", res.data)
        self.assertIn("total_estimated_generation_gwh", res.data)
        self.assertIn("total_roof_area_m2", res.data)
        self.assertIn("by_status", res.data)

    def test_stats_values(self):
        res = self.client.get(self.url)
        self.assertEqual(res.data["total_projects"], 2)
        self.assertEqual(res.data["active_installations"], 1)
        self.assertAlmostEqual(res.data["total_estimated_generation_mwh"], 27.0)

    def test_stats_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class GlobalMetricsTests(APITestCase):
    url = "/api/projects/metrics/global/latest/"

    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_returns_defaults_when_no_record(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("total_generation_gwh", res.data)
        self.assertIn("active_installations", res.data)

    def test_returns_db_record_when_present(self):
        GlobalMetrics.objects.create(
            total_generation_gwh=5.0,
            generation_change_pct=8.5,
            active_installations=200,
            estimated_savings_usd=50000,
        )
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(float(res.data["total_generation_gwh"]), 5.0)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
