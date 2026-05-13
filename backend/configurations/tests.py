from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from projects.models import Project
from .models import PanelSpec, InverterSpec, SystemConfiguration


def make_user(username="confuser", password="Pass123!", email="conf@example.com", is_staff=False):
    return User.objects.create_user(username=username, password=password, email=email, is_staff=is_staff)


def make_project(owner=None):
    return Project.objects.create(owner=owner, name="Config Project", location="Edmonton, AB")


def make_panel(**kwargs):
    defaults = {
        "manufacturer": "SunPower",
        "model_name": "SPR-415",
        "watt_peak": 415,
        "length_mm": 1812,
        "width_mm": 1046,
        "efficiency_pct": 22.8,
        "warranty_years": 25,
    }
    defaults.update(kwargs)
    return PanelSpec.objects.create(**defaults)


def make_inverter(**kwargs):
    defaults = {
        "manufacturer": "SMA",
        "model_name": "Sunny Boy 5.0",
        "rated_power_kw": 5.0,
        "efficiency_pct": 97.2,
        "inverter_type": "string",
    }
    defaults.update(kwargs)
    return InverterSpec.objects.create(**defaults)


class PanelSpecTests(APITestCase):
    url = "/api/configurations/panels/"

    def setUp(self):
        self.user = make_user()
        self.staff = make_user(username="staffuser", email="staff@example.com", is_staff=True)
        self.client.force_authenticate(user=self.user)

    def test_list_panels_empty(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_list_panels_with_data(self):
        make_panel()
        make_panel(model_name="SPR-430", watt_peak=430)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)

    def test_create_panel_requires_staff(self):
        """Non-staff users cannot create panels."""
        res = self.client.post(self.url, {
            "manufacturer": "LG", "model_name": "LG400N2W", "watt_peak": 400,
            "length_mm": 1740, "width_mm": 1000, "efficiency_pct": 21.7, "warranty_years": 25,
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_panel_as_staff(self):
        """Staff users can create panels."""
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(self.url, {
            "manufacturer": "LG", "model_name": "LG400N2W", "watt_peak": 400,
            "length_mm": 1740, "width_mm": 1000, "efficiency_pct": 21.7, "warranty_years": 25,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PanelSpec.objects.count(), 1)

    def test_get_panel_detail(self):
        panel = make_panel()
        res = self.client.get(f"{self.url}{panel.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["manufacturer"], "SunPower")

    def test_patch_panel_as_staff(self):
        panel = make_panel()
        self.client.force_authenticate(user=self.staff)
        res = self.client.patch(f"{self.url}{panel.id}/", {"watt_peak": 420})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(float(res.data["watt_peak"]), 420.0)

    def test_delete_panel_as_staff(self):
        panel = make_panel()
        self.client.force_authenticate(user=self.staff)
        res = self.client.delete(f"{self.url}{panel.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(PanelSpec.objects.count(), 0)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class InverterSpecTests(APITestCase):
    url = "/api/configurations/inverters/"

    def setUp(self):
        self.user = make_user(username="invuser", email="inv@example.com")
        self.staff = make_user(username="invstaff", email="invstaff@example.com", is_staff=True)
        self.client.force_authenticate(user=self.user)

    def test_list_inverters_empty(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_create_inverter_requires_staff(self):
        """Non-staff users cannot create inverters."""
        res = self.client.post(self.url, {
            "manufacturer": "Fronius", "model_name": "Symo 8.2",
            "rated_power_kw": 8.2, "efficiency_pct": 98.0, "inverter_type": "string",
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_inverter_as_staff(self):
        """Staff users can create inverters."""
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(self.url, {
            "manufacturer": "Fronius", "model_name": "Symo 8.2",
            "rated_power_kw": 8.2, "efficiency_pct": 98.0, "inverter_type": "string",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InverterSpec.objects.count(), 1)

    def test_get_inverter_detail(self):
        inv = make_inverter()
        res = self.client.get(f"{self.url}{inv.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["manufacturer"], "SMA")

    def test_patch_inverter_as_staff(self):
        inv = make_inverter()
        self.client.force_authenticate(user=self.staff)
        res = self.client.patch(f"{self.url}{inv.id}/", {"efficiency_pct": 97.8})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(float(res.data["efficiency_pct"]), 97.8)

    def test_delete_inverter_as_staff(self):
        inv = make_inverter()
        self.client.force_authenticate(user=self.staff)
        res = self.client.delete(f"{self.url}{inv.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(InverterSpec.objects.count(), 0)


class SystemConfigurationTests(APITestCase):
    url = "/api/configurations/systems/"

    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.panel = make_panel()
        self.inverter = make_inverter()
        self.client.force_authenticate(user=self.user)

    def test_list_systems_empty(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_create_system(self):
        res = self.client.post(self.url, {
            "project": self.project.id,
            "panel_spec": self.panel.id,
            "inverter_spec": self.inverter.id,
            "num_panels": 20,
            "num_strings": 2,
            "panels_per_string": 10,
            "system_size_kwp": 8.3,
            "tilt_angle": 25,
            "azimuth_angle": 180,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SystemConfiguration.objects.count(), 1)

    def test_list_filters_by_project(self):
        p2 = Project.objects.create(owner=self.user, name="Other", location="Calgary")
        SystemConfiguration.objects.create(project=self.project, num_panels=10)
        SystemConfiguration.objects.create(project=p2, num_panels=5)
        res = self.client.get(self.url, {"project": self.project.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_patch_system(self):
        cfg = SystemConfiguration.objects.create(project=self.project, num_panels=10)
        res = self.client.patch(f"{self.url}{cfg.id}/", {"num_panels": 24})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["num_panels"], 24)

    def test_delete_system(self):
        cfg = SystemConfiguration.objects.create(project=self.project, num_panels=10)
        res = self.client.delete(f"{self.url}{cfg.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(SystemConfiguration.objects.count(), 0)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
