from rest_framework import serializers
from .models import EnergyReport, MonthlyGeneration


class MonthlyGenerationSerializer(serializers.ModelSerializer):
    month_name = serializers.ReadOnlyField()

    class Meta:
        model = MonthlyGeneration
        fields = ['id', 'month', 'month_name', 'generation_kwh', 'consumption_kwh',
                  'irradiance_kwh_m2', 'peak_power_kw']


class EnergyReportSerializer(serializers.ModelSerializer):
    monthly_data = MonthlyGenerationSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = EnergyReport
        fields = [
            'id', 'project', 'project_name', 'report_year',
            'total_generation_kwh', 'total_consumption_kwh', 'net_export_kwh',
            'co2_avoided_kg', 'revenue_usd', 'savings_usd',
            'performance_ratio', 'capacity_factor',
            'monthly_data', 'generated_at',
        ]
        read_only_fields = ['id', 'generated_at', 'project_name', 'monthly_data']
