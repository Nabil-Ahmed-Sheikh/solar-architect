from django.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('ARCHIVED', 'Archived'),
    ]

    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='projects')
    roof_area = models.FloatField(help_text='Roof area in m²', default=0)
    estimated_generation = models.FloatField(help_text='Est. generation in MWh/year', default=0)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.location}"


class GlobalMetrics(models.Model):
    """Singleton-style model for global dashboard metrics."""
    total_generation_gwh = models.FloatField(default=0)
    generation_change_pct = models.FloatField(default=0, help_text='% change vs last month')
    active_installations = models.IntegerField(default=0)
    estimated_savings_usd = models.FloatField(default=0, help_text='YTD savings in USD')
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"GlobalMetrics @ {self.recorded_at}"
