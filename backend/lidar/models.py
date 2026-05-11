from django.db import models
import json


class LiDARScan(models.Model):
    """Represents a LiDAR data acquisition and processing job."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('downloading', 'Downloading'),
        ('processing', 'Processing'),
        ('analyzing', 'Analyzing'),
        ('complete', 'Complete'),
        ('failed', 'Failed'),
    ]

    SOURCE_CHOICES = [
        ('alberta_open', 'Alberta Open Data'),
        ('usgs_3dep', 'USGS 3DEP'),
        ('upload', 'Manual Upload'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='lidar_scans'
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    bbox_north = models.FloatField(null=True, blank=True)
    bbox_south = models.FloatField(null=True, blank=True)
    bbox_east = models.FloatField(null=True, blank=True)
    bbox_west = models.FloatField(null=True, blank=True)

    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='alberta_open')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress_pct = models.IntegerField(default=0)
    status_message = models.TextField(blank=True)

    # Raw data paths
    laz_file_path = models.CharField(max_length=500, blank=True)
    dsm_file_path = models.CharField(max_length=500, blank=True)
    dtm_file_path = models.CharField(max_length=500, blank=True)

    # Processed metadata
    point_count = models.BigIntegerField(null=True, blank=True)
    point_density = models.FloatField(null=True, blank=True, help_text='pts/m²')
    elevation_min = models.FloatField(null=True, blank=True)
    elevation_max = models.FloatField(null=True, blank=True)
    scan_resolution_m = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"LiDARScan [{self.status}] for {self.project.name}"


class DSMTile(models.Model):
    """A processed DSM (Digital Surface Model) raster tile."""
    scan = models.OneToOneField(LiDARScan, on_delete=models.CASCADE, related_name='dsm_tile')
    width_px = models.IntegerField(default=0)
    height_px = models.IntegerField(default=0)
    resolution_m = models.FloatField(default=0.5)
    # Base64-encoded PNG preview of the DSM colourmap (small thumbnail)
    preview_b64 = models.TextField(blank=True)
    # Full grid as JSON-serialized 2D list (downsampled for API)
    elevation_grid_json = models.TextField(blank=True, help_text='JSON 2D array of elevations (downsampled)')
    geotiff_path = models.CharField(max_length=500, blank=True)

    def get_elevation_grid(self):
        if self.elevation_grid_json:
            return json.loads(self.elevation_grid_json)
        return []

    def set_elevation_grid(self, grid):
        self.elevation_grid_json = json.dumps(grid)


class RoofSegment(models.Model):
    """A plane-fitted roof segment extracted from LiDAR data."""

    ORIENTATION_LABELS = [
        ('N', 'North'), ('NE', 'Northeast'), ('E', 'East'), ('SE', 'Southeast'),
        ('S', 'South'), ('SW', 'Southwest'), ('W', 'West'), ('NW', 'Northwest'),
        ('FLAT', 'Flat'),
    ]

    scan = models.ForeignKey(LiDARScan, on_delete=models.CASCADE, related_name='roof_segments')
    segment_index = models.IntegerField()

    # Plane-fitting results
    slope_degrees = models.FloatField(help_text='Tilt angle from horizontal')
    azimuth_degrees = models.FloatField(help_text='0=N, 90=E, 180=S, 270=W')
    orientation_label = models.CharField(max_length=4, choices=ORIENTATION_LABELS)
    area_m2 = models.FloatField()
    usable_area_m2 = models.FloatField()

    # 3D plane equation: ax + by + cz = d
    plane_normal_x = models.FloatField(default=0)
    plane_normal_y = models.FloatField(default=0)
    plane_normal_z = models.FloatField(default=1)
    plane_d = models.FloatField(default=0)

    # Centroid
    centroid_x = models.FloatField(default=0)
    centroid_y = models.FloatField(default=0)
    centroid_z = models.FloatField(default=0)

    # Shading analysis results
    annual_shade_factor = models.FloatField(default=0, help_text='0=no shade, 1=fully shaded')
    solar_access_pct = models.FloatField(default=100)
    peak_irradiance_kwh_m2 = models.FloatField(default=0)

    # Polygon boundary (list of [x,y] coords in local coordinates)
    boundary_json = models.TextField(blank=True)

    # Suitability score 0-100
    suitability_score = models.IntegerField(default=0)

    class Meta:
        ordering = ['-suitability_score']

    def __str__(self):
        return f"Segment {self.segment_index} — {self.slope_degrees:.1f}° {self.orientation_label}"

    @property
    def boundary(self):
        import json
        return json.loads(self.boundary_json) if self.boundary_json else []

    @boundary.setter
    def boundary(self, value):
        import json
        self.boundary_json = json.dumps(value)


class ShadingObstacle(models.Model):
    """A detected shading obstacle (tree, chimney, HVAC, adjacent building)."""

    TYPE_CHOICES = [
        ('tree', 'Tree'),
        ('chimney', 'Chimney'),
        ('hvac', 'HVAC Unit'),
        ('vent', 'Vent Stack'),
        ('building', 'Adjacent Building'),
        ('other', 'Other'),
    ]

    scan = models.ForeignKey(LiDARScan, on_delete=models.CASCADE, related_name='obstacles')
    obstacle_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    label = models.CharField(max_length=100)

    # Position relative to site center
    offset_x_m = models.FloatField(default=0)
    offset_y_m = models.FloatField(default=0)
    height_m = models.FloatField(default=0)
    width_m = models.FloatField(default=1)
    depth_m = models.FloatField(default=1)

    # Shading impact
    affected_area_pct = models.FloatField(default=0)
    peak_loss_kwh = models.FloatField(default=0)

    class Meta:
        ordering = ['-height_m']

    def __str__(self):
        return f"{self.label} ({self.height_m}m {self.obstacle_type})"
