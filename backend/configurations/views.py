from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import PanelSpec, InverterSpec, SystemConfiguration
from .serializers import PanelSpecSerializer, InverterSpecSerializer, SystemConfigurationSerializer


class PanelSpecViewSet(viewsets.ModelViewSet):
    queryset = PanelSpec.objects.all()
    serializer_class = PanelSpecSerializer
    permission_classes = [IsAuthenticated]


class InverterSpecViewSet(viewsets.ModelViewSet):
    queryset = InverterSpec.objects.all()
    serializer_class = InverterSpecSerializer
    permission_classes = [IsAuthenticated]


class SystemConfigurationViewSet(viewsets.ModelViewSet):
    queryset = SystemConfiguration.objects.select_related(
        'project', 'panel_spec', 'inverter_spec'
    )
    serializer_class = SystemConfigurationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs
