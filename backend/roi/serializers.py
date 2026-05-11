from rest_framework import serializers
from .models import ROIAnalysis, YearlyProjection


class YearlyProjectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = YearlyProjection
        fields = [
            'year', 'utility_cost_usd', 'solar_payout_usd',
            'net_savings_usd', 'cumulative_savings_usd',
            'generation_kwh', 'utility_rate_kwh',
        ]


class ROIAnalysisSerializer(serializers.ModelSerializer):
    yearly_projections = YearlyProjectionSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = ROIAnalysis
        fields = [
            'id', 'project', 'project_name', 'name',
            'system_size_kwp', 'system_cost_usd', 'annual_production_kwh',
            'panel_degradation_pct',
            'federal_itc_pct', 'provincial_rebate_usd', 'srec_revenue_annual_usd',
            'loan_amount_usd', 'loan_interest_rate_pct', 'loan_term_years',
            'current_utility_rate_kwh', 'utility_inflation_rate_pct',
            'net_metering_rate_kwh', 'annual_om_cost_usd',
            # Computed outputs
            'net_system_cost_usd', 'payback_years', 'irr_pct',
            'npv_usd', 'lcoe_per_kwh', 'lifetime_savings_usd',
            'lifetime_utility_cost_usd', 'lifetime_solar_cost_usd',
            'yearly_projections',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'net_system_cost_usd', 'payback_years', 'irr_pct',
            'npv_usd', 'lcoe_per_kwh', 'lifetime_savings_usd',
            'lifetime_utility_cost_usd', 'lifetime_solar_cost_usd',
            'yearly_projections', 'created_at', 'updated_at', 'project_name',
        ]


class ROIAnalysisLightSerializer(serializers.ModelSerializer):
    """Lightweight — no yearly rows."""
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = ROIAnalysis
        exclude = ['yearly_projections'] if False else []
        fields = [
            'id', 'project', 'project_name', 'name',
            'system_size_kwp', 'system_cost_usd',
            'net_system_cost_usd', 'payback_years', 'irr_pct',
            'npv_usd', 'lcoe_per_kwh', 'lifetime_savings_usd',
            'created_at',
        ]
