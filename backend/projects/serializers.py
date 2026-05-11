from rest_framework import serializers
from .models import Project, GlobalMetrics


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'location', 'status', 'owner', 'owner_name',
            'roof_area', 'estimated_generation', 'latitude', 'longitude',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner_name']

    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.username
        return None


class GlobalMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalMetrics
        fields = '__all__'
