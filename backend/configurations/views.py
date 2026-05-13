from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import PanelSpec, InverterSpec, SystemConfiguration
from .serializers import PanelSpecSerializer, InverterSpecSerializer, SystemConfigurationSerializer


class PanelSpecViewSet(viewsets.ModelViewSet):
    """Shared panel catalog — read-only for all authenticated users, writable by staff only."""
    queryset = PanelSpec.objects.all()
    serializer_class = PanelSpecSerializer

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated()]
        return [IsAdminUser()]


class InverterSpecViewSet(viewsets.ModelViewSet):
    """Shared inverter catalog — read-only for all authenticated users, writable by staff only."""
    queryset = InverterSpec.objects.all()
    serializer_class = InverterSpecSerializer

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated()]
        return [IsAdminUser()]


class SystemConfigurationViewSet(viewsets.ModelViewSet):
    queryset = SystemConfiguration.objects.select_related(
        'project', 'panel_spec', 'inverter_spec'
    )
    serializer_class = SystemConfigurationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs
