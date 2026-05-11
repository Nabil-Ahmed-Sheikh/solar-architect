from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from .models import Project, GlobalMetrics
from .serializers import ProjectSerializer, GlobalMetricsSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(location__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return aggregated dashboard stats."""
        total_projects = Project.objects.count()
        active = Project.objects.filter(status='ACTIVE').count()
        total_generation = Project.objects.aggregate(
            total=Sum('estimated_generation')
        )['total'] or 0
        total_area = Project.objects.aggregate(
            total=Sum('roof_area')
        )['total'] or 0
        by_status = list(
            Project.objects.values('status').annotate(count=Count('id'))
        )
        return Response({
            'total_projects': total_projects,
            'active_installations': active,
            'total_estimated_generation_mwh': round(total_generation, 2),
            'total_estimated_generation_gwh': round(total_generation / 1000, 3),
            'total_roof_area_m2': round(total_area, 2),
            'by_status': by_status,
        })


class GlobalMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GlobalMetrics.objects.all()
    serializer_class = GlobalMetricsSerializer

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Return the most recent global metrics snapshot."""
        metrics = GlobalMetrics.objects.first()
        if metrics:
            return Response(GlobalMetricsSerializer(metrics).data)
        return Response({
            'total_generation_gwh': 1.42,
            'generation_change_pct': 12.4,
            'active_installations': 342,
            'estimated_savings_usd': 84200,
        })
