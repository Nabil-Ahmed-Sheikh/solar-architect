from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ROIAnalysis
from .serializers import ROIAnalysisSerializer, ROIAnalysisLightSerializer


class ROIAnalysisViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ROIAnalysis.objects.select_related('project').prefetch_related('yearly_projections')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ROIAnalysisLightSerializer
        return ROIAnalysisSerializer

    def perform_create(self, serializer):
        analysis = serializer.save()
        analysis.calculate()

    def perform_update(self, serializer):
        analysis = serializer.save()
        analysis.calculate()

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """Re-run the financial model with updated parameters."""
        analysis = self.get_object()
        # Allow partial param overrides
        for field in [
            'loan_interest_rate_pct', 'utility_inflation_rate_pct',
            'loan_term_years', 'federal_itc_pct', 'system_cost_usd',
            'current_utility_rate_kwh', 'annual_production_kwh',
        ]:
            if field in request.data:
                setattr(analysis, field, request.data[field])
        analysis.save()
        analysis.calculate()
        return Response(ROIAnalysisSerializer(analysis).data)

    @action(detail=False, methods=['post'])
    def quick_estimate(self, request):
        """
        Return a quick ROI estimate without persisting.
        Useful for slider-driven UI updates.
        """
        from .calculator import ROICalculator

        class _MockAnalysis:
            pass

        a = _MockAnalysis()
        a.system_size_kwp = float(request.data.get('system_size_kwp', 10))
        a.system_cost_usd = float(request.data.get('system_cost_usd', 35000))
        a.annual_production_kwh = float(request.data.get('annual_production_kwh', 12000))
        a.panel_degradation_pct = float(request.data.get('panel_degradation_pct', 0.5))
        a.federal_itc_pct = float(request.data.get('federal_itc_pct', 30))
        a.provincial_rebate_usd = float(request.data.get('provincial_rebate_usd', 0))
        a.srec_revenue_annual_usd = float(request.data.get('srec_revenue_annual_usd', 0))
        a.loan_amount_usd = float(request.data.get('loan_amount_usd', 0))
        a.loan_interest_rate_pct = float(request.data.get('loan_interest_rate_pct', 5.5))
        a.loan_term_years = int(request.data.get('loan_term_years', 20))
        a.current_utility_rate_kwh = float(request.data.get('current_utility_rate_kwh', 0.18))
        a.utility_inflation_rate_pct = float(request.data.get('utility_inflation_rate_pct', 3.5))
        a.net_metering_rate_kwh = float(request.data.get('net_metering_rate_kwh', 0.10))
        a.annual_om_cost_usd = float(request.data.get('annual_om_cost_usd', 200))

        calc = ROICalculator(a)
        calc.run()

        return Response({
            'net_system_cost_usd': a.net_system_cost_usd,
            'payback_years': a.payback_years,
            'irr_pct': a.irr_pct,
            'npv_usd': a.npv_usd,
            'lcoe_per_kwh': a.lcoe_per_kwh,
            'lifetime_savings_usd': a.lifetime_savings_usd,
            'lifetime_utility_cost_usd': a.lifetime_utility_cost_usd,
            'lifetime_solar_cost_usd': a.lifetime_solar_cost_usd,
            'yearly_projections': [
                {
                    'year': p.year,
                    'utility_cost_usd': p.utility_cost_usd,
                    'solar_payout_usd': p.solar_payout_usd,
                    'net_savings_usd': p.net_savings_usd,
                    'cumulative_savings_usd': p.cumulative_savings_usd,
                }
                for p in (a.yearly_projections if hasattr(a, 'yearly_projections') else [])
            ],
        })
