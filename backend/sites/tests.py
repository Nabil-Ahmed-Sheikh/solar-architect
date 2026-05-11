from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from projects.models import Project
from .models import SiteAnalysis, ShadeProfile


def make_user(username="siteuser", password="Pass123!", email="site@example.com"):
    return User.objects.create_user(username=username, password=password, email=email)


def make_project(owner=None):
    return Project.objects.create(owner=owner, name="Test Project", location="Edmonton, AB")


def make_site(project, **kwargs):
    defaults = {
        "address": "123 Main St, Edmonton, AB",
        "latitude": 53.5461,
        "longitude": -113.4938,
        "peak_sun_hours": 1900,
        "roof_type": "gable",
        "usable_roof_area": 80.0,
        "total_roof_area": 100.0,
    }
    defaults.update(kwargs)
    return SiteAnalysis.objects.create(project=project, **defaults)


class SiteListCreateTests(APITestCase):
    url = "/api/sites/"

    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.client.force_authenticate(user=self.user)

    def test_list_empty(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_create_site(self):
        res = self.client.post(self.url, {
            "project": self.project.id,
            "address": "456 Solar Ave",
            "latitude": 51.0447,
            "longitude": -114.0719,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SiteAnalysis.objects.count(), 1)

    def test_list_filters_by_project(self):
        p2 = Project.objects.create(owner=self.user, name="Other Project", location="Calgary, AB")
        make_site(self.project)
        make_site(p2)
        res = self.client.get(self.url, {"project": self.project.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class SiteDetailTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.site = make_site(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/sites/{self.site.id}/"

    def test_get_site(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["address"], "123 Main St, Edmonton, AB")
        self.assertIn("shade_profiles", res.data)

    def test_patch_site(self):
        res = self.client.patch(self.url, {"utility_provider": "EPCOR", "current_rate_kwh": 0.17})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["utility_provider"], "EPCOR")
        self.assertAlmostEqual(float(res.data["current_rate_kwh"]), 0.17)

    def test_get_nonexistent(self):
        res = self.client.get("/api/sites/99999/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class AdvanceStepTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.site = make_site(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/sites/{self.site.id}/advance_step/"

    def test_advance_step(self):
        res = self.client.post(self.url, {"step": 2})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.site.refresh_from_db()
        self.assertEqual(self.site.current_step, 2)

    def test_advance_step_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.post(self.url, {"step": 2})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class AddShadeProfileTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.site = make_site(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/sites/{self.site.id}/add_shade_profile/"

    def test_add_shade_profiles(self):
        profiles = [{"month": i, "shading_factor": round(0.05 * i, 2)} for i in range(1, 13)]
        res = self.client.post(self.url, profiles, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ShadeProfile.objects.filter(site=self.site).count(), 12)

    def test_add_shade_profiles_replaces_existing(self):
        ShadeProfile.objects.create(site=self.site, month=1, shading_factor=0.9)
        profiles = [{"month": 1, "shading_factor": 0.1}]
        res = self.client.post(self.url, profiles, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        profile = ShadeProfile.objects.get(site=self.site, month=1)
        self.assertAlmostEqual(profile.shading_factor, 0.1)
