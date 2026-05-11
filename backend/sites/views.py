from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import SiteAnalysis, ShadeProfile
from .serializers import SiteAnalysisSerializer, ShadeProfileSerializer


class SiteAnalysisViewSet(viewsets.ModelViewSet):
    queryset = SiteAnalysis.objects.select_related('project').prefetch_related('shade_profiles')
    serializer_class = SiteAnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=True, methods=['post'])
    def advance_step(self, request, pk=None):
        """Advance the wizard step and save step data."""
        site = self.get_object()
        step = request.data.get('step')
        if step and int(step) > site.current_step:
            site.current_step = int(step)
            site.save(update_fields=['current_step', 'updated_at'])
        serializer = self.get_serializer(site)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_shade_profile(self, request, pk=None):
        site = self.get_object()
        data = [{'site': site.id, **item} for item in request.data]
        serializer = ShadeProfileSerializer(data=data, many=True)
        serializer.is_valid(raise_exception=True)
        # Delete existing and replace
        site.shade_profiles.all().delete()
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
