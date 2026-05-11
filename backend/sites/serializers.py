from rest_framework import serializers
from .models import SiteAnalysis, ShadeProfile


class ShadeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShadeProfile
        fields = ['id', 'month', 'shading_factor']


class SiteAnalysisSerializer(serializers.ModelSerializer):
    shade_profiles = ShadeProfileSerializer(many=True, read_only=True)

    class Meta:
        model = SiteAnalysis
        fields = [
            'id', 'project',
            'address', 'latitude', 'longitude', 'peak_sun_hours', 'irradiance_zone',
            'roof_type', 'roof_pitch_degrees', 'roof_orientation_degrees',
            'usable_roof_area', 'total_roof_area',
            'utility_provider', 'current_rate_kwh', 'annual_consumption_kwh',
            'net_metering_available', 'feed_in_tariff',
            'current_step', 'shade_profiles',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'shade_profiles']
