from rest_framework import serializers
from .models import PanelSpec, InverterSpec, SystemConfiguration


class PanelSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = PanelSpec
        fields = '__all__'


class InverterSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = InverterSpec
        fields = '__all__'


class SystemConfigurationSerializer(serializers.ModelSerializer):
    panel_spec_detail = PanelSpecSerializer(source='panel_spec', read_only=True)
    inverter_spec_detail = InverterSpecSerializer(source='inverter_spec', read_only=True)

    class Meta:
        model = SystemConfiguration
        fields = [
            'id', 'project',
            'panel_spec', 'panel_spec_detail',
            'inverter_spec', 'inverter_spec_detail',
            'num_panels', 'num_strings', 'panels_per_string',
            'system_size_kwp', 'tilt_angle', 'azimuth_angle',
            'layout_data',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
