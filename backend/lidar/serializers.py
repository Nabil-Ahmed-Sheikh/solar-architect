from rest_framework import serializers
from .models import LiDARScan, DSMTile, RoofSegment, ShadingObstacle
import json


class DSMTileSerializer(serializers.ModelSerializer):
    elevation_grid = serializers.SerializerMethodField()

    class Meta:
        model = DSMTile
        fields = ['id', 'width_px', 'height_px', 'resolution_m', 'elevation_grid', 'preview_b64']

    def get_elevation_grid(self, obj):
        return obj.get_elevation_grid()


class ShadingObstacleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShadingObstacle
        fields = [
            'id', 'obstacle_type', 'label',
            'offset_x_m', 'offset_y_m', 'height_m', 'width_m', 'depth_m',
            'affected_area_pct', 'peak_loss_kwh',
        ]


class RoofSegmentSerializer(serializers.ModelSerializer):
    boundary = serializers.SerializerMethodField()

    class Meta:
        model = RoofSegment
        fields = [
            'id', 'segment_index',
            'slope_degrees', 'azimuth_degrees', 'orientation_label',
            'area_m2', 'usable_area_m2',
            'plane_normal_x', 'plane_normal_y', 'plane_normal_z', 'plane_d',
            'centroid_x', 'centroid_y', 'centroid_z',
            'annual_shade_factor', 'solar_access_pct', 'peak_irradiance_kwh_m2',
            'suitability_score', 'boundary',
        ]

    def get_boundary(self, obj):
        return obj.boundary


class LiDARScanSerializer(serializers.ModelSerializer):
    dsm_tile = DSMTileSerializer(read_only=True)
    roof_segments = RoofSegmentSerializer(many=True, read_only=True)
    obstacles = ShadingObstacleSerializer(many=True, read_only=True)

    class Meta:
        model = LiDARScan
        fields = [
            'id', 'project', 'latitude', 'longitude',
            'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west',
            'source', 'status', 'progress_pct', 'status_message',
            'point_count', 'point_density', 'elevation_min', 'elevation_max',
            'scan_resolution_m', 'dsm_tile', 'roof_segments', 'obstacles',
            'created_at', 'updated_at', 'completed_at',
        ]
        read_only_fields = [
            'id', 'status', 'progress_pct', 'status_message',
            'point_count', 'point_density', 'elevation_min', 'elevation_max',
            'scan_resolution_m', 'dsm_tile', 'roof_segments', 'obstacles',
            'created_at', 'updated_at', 'completed_at',
        ]


class LiDARScanListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no heavy grid data)."""
    segment_count = serializers.SerializerMethodField()
    best_segment = serializers.SerializerMethodField()

    class Meta:
        model = LiDARScan
        fields = [
            'id', 'project', 'latitude', 'longitude',
            'status', 'progress_pct', 'status_message',
            'point_count', 'point_density', 'segment_count', 'best_segment',
            'created_at', 'completed_at',
        ]

    def get_segment_count(self, obj):
        return obj.roof_segments.count()

    def get_best_segment(self, obj):
        seg = obj.roof_segments.order_by('-suitability_score').first()
        if seg:
            return {
                'slope_degrees': seg.slope_degrees,
                'azimuth_degrees': seg.azimuth_degrees,
                'orientation_label': seg.orientation_label,
                'area_m2': seg.area_m2,
                'suitability_score': seg.suitability_score,
                'solar_access_pct': seg.solar_access_pct,
            }
        return None
