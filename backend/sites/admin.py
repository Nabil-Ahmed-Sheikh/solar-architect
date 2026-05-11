from django.contrib import admin
from .models import SiteAnalysis, ShadeProfile


class ShadeProfileInline(admin.TabularInline):
    model = ShadeProfile
    extra = 0


@admin.register(SiteAnalysis)
class SiteAnalysisAdmin(admin.ModelAdmin):
    list_display = ['project', 'address', 'latitude', 'longitude', 'peak_sun_hours', 'current_step']
    inlines = [ShadeProfileInline]
