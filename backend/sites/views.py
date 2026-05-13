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
        qs = super().get_queryset().filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=True, methods=['post'])
    def advance_step(self, request, pk=None):
        """Advance the wizard step and save step data."""
        site = self.get_object()
        try:
            step = int(request.data.get('step'))
        except (TypeError, ValueError):
            return Response({'error': 'step must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        if not 1 <= step <= 3:
            return Response({'error': 'step must be 1, 2, or 3'}, status=status.HTTP_400_BAD_REQUEST)
        if step > site.current_step:
            site.current_step = step
            site.save(update_fields=['current_step', 'updated_at'])
        serializer = self.get_serializer(site)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_shade_profile(self, request, pk=None):
        if not isinstance(request.data, list):
            return Response({'error': 'Expected a JSON array'}, status=status.HTTP_400_BAD_REQUEST)
        site = self.get_object()
        serializer = ShadeProfileSerializer(data=list(request.data), many=True)
        serializer.is_valid(raise_exception=True)
        site.shade_profiles.all().delete()
        ShadeProfile.objects.bulk_create([
            ShadeProfile(site=site, **attrs)
            for attrs in serializer.validated_data
        ])
        return Response(ShadeProfileSerializer(site.shade_profiles.all(), many=True).data, status=status.HTTP_201_CREATED)
