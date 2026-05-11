from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import EnergyReport, MonthlyGeneration
from .serializers import EnergyReportSerializer, MonthlyGenerationSerializer


class EnergyReportViewSet(viewsets.ModelViewSet):
    queryset = EnergyReport.objects.select_related('project').prefetch_related('monthly_data')
    serializer_class = EnergyReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        year = self.request.query_params.get('year')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if year:
            qs = qs.filter(report_year=year)
        return qs

    @action(detail=True, methods=['post'])
    def add_monthly_data(self, request, pk=None):
        """Bulk create/replace monthly generation data for this report."""
        report = self.get_object()
        report.monthly_data.all().delete()
        data = [{'report': report.id, **item} for item in request.data]
        serializer = MonthlyGenerationSerializer(data=data, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Aggregated generation summary across all projects."""
        from django.db.models import Sum, Avg
        agg = EnergyReport.objects.aggregate(
            total_kwh=Sum('total_generation_kwh'),
            total_savings=Sum('savings_usd'),
            total_co2=Sum('co2_avoided_kg'),
            avg_performance=Avg('performance_ratio'),
        )
        return Response(agg)
