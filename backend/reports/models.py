from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from projects.models import Project


class EnergyReport(models.Model):
    """Annual/monthly energy generation report for a project."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='reports')
    report_year = models.IntegerField()

    # Annual totals
    total_generation_kwh = models.FloatField(default=0, validators=[MinValueValidator(0)])
    total_consumption_kwh = models.FloatField(default=0, validators=[MinValueValidator(0)])
    net_export_kwh = models.FloatField(default=0)
    co2_avoided_kg = models.FloatField(default=0, validators=[MinValueValidator(0)])
    revenue_usd = models.FloatField(default=0)
    savings_usd = models.FloatField(default=0)
    performance_ratio = models.FloatField(default=0, help_text='0-1', validators=[MinValueValidator(0), MaxValueValidator(1)])
    capacity_factor = models.FloatField(default=0, help_text='%', validators=[MinValueValidator(0), MaxValueValidator(100)])

    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['project', 'report_year']
        ordering = ['-report_year']

    def __str__(self):
        return f"Report {self.report_year} — {self.project.name}"


class MonthlyGeneration(models.Model):
    """Monthly energy generation breakdown."""
    report = models.ForeignKey(EnergyReport, on_delete=models.CASCADE, related_name='monthly_data')
    month = models.IntegerField(choices=[(i, i) for i in range(1, 13)])
    generation_kwh = models.FloatField(default=0, validators=[MinValueValidator(0)])
    consumption_kwh = models.FloatField(default=0, validators=[MinValueValidator(0)])
    irradiance_kwh_m2 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    peak_power_kw = models.FloatField(default=0, validators=[MinValueValidator(0)])

    class Meta:
        unique_together = ['report', 'month']
        ordering = ['month']

    MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    @property
    def month_name(self):
        return self.MONTH_NAMES[self.month - 1]

    def __str__(self):
        return f"{self.month_name}: {self.generation_kwh} kWh"
