from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from projects.models import Project


class PanelSpec(models.Model):
    """Solar panel product specification."""
    manufacturer = models.CharField(max_length=255)
    model_name = models.CharField(max_length=255)
    watt_peak = models.FloatField(help_text='Panel wattage (Wp)', validators=[MinValueValidator(1)])
    length_mm = models.FloatField()
    width_mm = models.FloatField()
    efficiency_pct = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    temperature_coefficient = models.FloatField(default=-0.35, help_text='%/°C')
    warranty_years = models.IntegerField(default=25)

    def __str__(self):
        return f"{self.manufacturer} {self.model_name} {self.watt_peak}W"


class InverterSpec(models.Model):
    """Inverter product specification."""
    manufacturer = models.CharField(max_length=255)
    model_name = models.CharField(max_length=255)
    rated_power_kw = models.FloatField(validators=[MinValueValidator(0.1)])
    efficiency_pct = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    inverter_type = models.CharField(max_length=50, choices=[
        ('string', 'String'), ('micro', 'Microinverter'), ('optimizer', 'Power Optimizer')
    ], default='string')

    def __str__(self):
        return f"{self.manufacturer} {self.model_name} {self.rated_power_kw}kW"


class SystemConfiguration(models.Model):
    """Full system design for a project."""
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='configuration')
    panel_spec = models.ForeignKey(PanelSpec, on_delete=models.SET_NULL, null=True, blank=True)
    inverter_spec = models.ForeignKey(InverterSpec, on_delete=models.SET_NULL, null=True, blank=True)

    num_panels = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    num_strings = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    panels_per_string = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    system_size_kwp = models.FloatField(default=0, validators=[MinValueValidator(0)])
    tilt_angle = models.FloatField(default=20, validators=[MinValueValidator(0), MaxValueValidator(90)])
    azimuth_angle = models.FloatField(default=180, validators=[MinValueValidator(0), MaxValueValidator(360)])

    # Layout grid (JSON string of panel positions)
    layout_data = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Config for {self.project.name} — {self.system_size_kwp} kWp"
