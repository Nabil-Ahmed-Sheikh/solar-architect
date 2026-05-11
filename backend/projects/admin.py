from django.contrib import admin
from .models import Project, GlobalMetrics


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'status', 'roof_area', 'estimated_generation', 'created_at']
    list_filter = ['status']
    search_fields = ['name', 'location']


@admin.register(GlobalMetrics)
class GlobalMetricsAdmin(admin.ModelAdmin):
    list_display = ['total_generation_gwh', 'active_installations', 'estimated_savings_usd', 'recorded_at']
