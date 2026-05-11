from django.contrib import admin
from .models import LiDARScan, DSMTile, RoofSegment, ShadingObstacle


class RoofSegmentInline(admin.TabularInline):
    model = RoofSegment
    extra = 0
    readonly_fields = ['slope_degrees', 'azimuth_degrees', 'orientation_label',
                       'area_m2', 'suitability_score', 'solar_access_pct']

class ObstacleInline(admin.TabularInline):
    model = ShadingObstacle
    extra = 0


@admin.register(LiDARScan)
class LiDARScanAdmin(admin.ModelAdmin):
    list_display = ['project', 'status', 'progress_pct', 'point_count', 'point_density', 'created_at']
    list_filter = ['status', 'source']
    readonly_fields = ['status', 'progress_pct', 'status_message', 'point_count',
                       'point_density', 'elevation_min', 'elevation_max', 'completed_at']
    inlines = [RoofSegmentInline, ObstacleInline]


@admin.register(RoofSegment)
class RoofSegmentAdmin(admin.ModelAdmin):
    list_display = ['scan', 'segment_index', 'slope_degrees', 'orientation_label',
                    'area_m2', 'suitability_score', 'solar_access_pct']
    list_filter = ['orientation_label']
