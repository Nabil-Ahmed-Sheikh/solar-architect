from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from projects.models import Project
from .models import LiDARScan, RoofSegment, ShadingObstacle


def make_user(username="lidaruser", password="Pass123!", email="lidar@example.com"):
    return User.objects.create_user(username=username, password=password, email=email)


def make_project(owner=None):
    return Project.objects.create(owner=owner, name="LiDAR Project", location="Edmonton, AB")


def make_scan(project, **kwargs):
    defaults = {
        "latitude": 53.5461,
        "longitude": -113.4938,
        "source": "alberta_open",
        "status": "pending",
    }
    defaults.update(kwargs)
    return LiDARScan.objects.create(project=project, **defaults)


class LiDARScanListCreateTests(APITestCase):
    url = "/api/lidar/scans/"

    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.client.force_authenticate(user=self.user)

    def test_list_empty(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_create_scan(self):
        res = self.client.post(self.url, {
            "project": self.project.id,
            "latitude": 53.5461,
            "longitude": -113.4938,
            "source": "alberta_open",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LiDARScan.objects.count(), 1)
        self.assertEqual(res.data["status"], "pending")

    def test_create_scan_missing_coords(self):
        res = self.client.post(self.url, {"project": self.project.id})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_project(self):
        p2 = Project.objects.create(owner=self.user, name="P2", location="Calgary")
        make_scan(self.project)
        make_scan(p2)
        res = self.client.get(self.url, {"project": self.project.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class LiDARScanDetailTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.scan = make_scan(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/lidar/scans/{self.scan.id}/"

    def test_get_scan(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "pending")
        self.assertIn("roof_segments", res.data)
        self.assertIn("obstacles", res.data)

    def test_patch_scan(self):
        # status is read-only (pipeline-managed); patch a writable field instead
        res = self.client.patch(self.url, {"source": "usgs_3dep"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["source"], "usgs_3dep")

    def test_delete_scan(self):
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(LiDARScan.objects.count(), 0)

    def test_get_nonexistent(self):
        res = self.client.get("/api/lidar/scans/99999/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class LiDARStatusTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.scan = make_scan(self.project, status="processing", progress_pct=55)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/lidar/scans/{self.scan.id}/status/"

    def test_poll_status(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "processing")
        self.assertEqual(res.data["progress_pct"], 55)
        self.assertIn("segment_count", res.data)

    def test_status_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class LiDARReprocessTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.scan = make_scan(self.project, status="failed", progress_pct=40)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/lidar/scans/{self.scan.id}/reprocess/"

    def test_reprocess_resets_status(self):
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], self.scan.id)
        self.scan.refresh_from_db()
        self.assertEqual(self.scan.status, "pending")
        self.assertEqual(self.scan.progress_pct, 0)

    def test_reprocess_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class LiDARSegmentsTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.scan = make_scan(self.project, status="complete")
        RoofSegment.objects.create(
            scan=self.scan, segment_index=0,
            slope_degrees=20, azimuth_degrees=180,
            orientation_label="S", area_m2=50, usable_area_m2=40,
            suitability_score=85,
        )
        RoofSegment.objects.create(
            scan=self.scan, segment_index=1,
            slope_degrees=20, azimuth_degrees=0,
            orientation_label="N", area_m2=50, usable_area_m2=10,
            suitability_score=30,
        )
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/lidar/scans/{self.scan.id}/segments/"

    def test_get_segments(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)
        # Ordered by suitability_score descending
        self.assertEqual(res.data[0]["suitability_score"], 85)

    def test_segments_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class LiDARObstaclesTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.scan = make_scan(self.project, status="complete")
        ShadingObstacle.objects.create(
            scan=self.scan, obstacle_type="chimney",
            label="Main Chimney", height_m=2.5,
            width_m=0.5, depth_m=0.5,
        )
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/lidar/scans/{self.scan.id}/obstacles/"

    def test_get_obstacles(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["obstacle_type"], "chimney")

    def test_obstacles_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class LiDARDSMGridTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.project = make_project(owner=self.user)
        self.scan = make_scan(self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f"/api/lidar/scans/{self.scan.id}/dsm_grid/"

    def test_dsm_not_ready_returns_404(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", res.data)

    def test_dsm_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class LiDARGoogleMapsKeyTests(APITestCase):
    url = "/api/lidar/scans/google_maps_key/"

    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_returns_key_shape(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("key", res.data)
        self.assertIn("available", res.data)

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
