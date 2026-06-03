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

    def validate(self, data):
        num_panels = data.get('num_panels', getattr(self.instance, 'num_panels', None))
        num_strings = data.get('num_strings', getattr(self.instance, 'num_strings', None))
        panels_per_string = data.get('panels_per_string', getattr(self.instance, 'panels_per_string', None))
        if (
            num_panels is not None
            and num_strings is not None
            and panels_per_string is not None
            and num_strings > 0
            and panels_per_string > 0
            and num_panels != num_strings * panels_per_string
        ):
            raise serializers.ValidationError(
                {'num_panels': 'num_panels must equal num_strings × panels_per_string.'}
            )
        return data
