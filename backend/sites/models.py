from django.db import models
from projects.models import Project


class SiteAnalysis(models.Model):
    """Stores site analysis data for a project."""
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='site_analysis')

    # Location
    address = models.CharField(max_length=500, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    peak_sun_hours = models.FloatField(default=0, help_text='Peak sun hours per year')
    irradiance_zone = models.CharField(max_length=100, blank=True)

    # Roof Geometry
    roof_type = models.CharField(max_length=50, default='flat',
        choices=[('flat','Flat'),('gable','Gable'),('hip','Hip'),('shed','Shed'),('mansard','Mansard')])
    roof_pitch_degrees = models.FloatField(default=0)
    roof_orientation_degrees = models.FloatField(default=180, help_text='Azimuth: 0=N,90=E,180=S,270=W')
    usable_roof_area = models.FloatField(default=0, help_text='Usable area in m²')
    total_roof_area = models.FloatField(default=0, help_text='Total roof area in m²')

    # Utility Economics
    utility_provider = models.CharField(max_length=255, blank=True)
    current_rate_kwh = models.FloatField(default=0, help_text='Current electricity rate $/kWh')
    annual_consumption_kwh = models.FloatField(default=0, help_text='Annual consumption in kWh')
    net_metering_available = models.BooleanField(default=False)
    feed_in_tariff = models.FloatField(default=0, help_text='Feed-in tariff $/kWh')

    # Analysis step (1=Location, 2=Roof Geometry, 3=Utility Economics)
    current_step = models.IntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"SiteAnalysis for {self.project.name}"


class ShadeProfile(models.Model):
    """Monthly shade profile data."""
    site = models.ForeignKey(SiteAnalysis, on_delete=models.CASCADE, related_name='shade_profiles')
    month = models.IntegerField(choices=[(i, i) for i in range(1, 13)])
    shading_factor = models.FloatField(default=0, help_text='0=no shade, 1=full shade')

    class Meta:
        unique_together = ['site', 'month']
        ordering = ['month']

    def __str__(self):
        return f"Shade month {self.month}: {self.shading_factor}"
