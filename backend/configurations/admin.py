from django.contrib import admin
from .models import PanelSpec, InverterSpec, SystemConfiguration

admin.site.register(PanelSpec)
admin.site.register(InverterSpec)

@admin.register(SystemConfiguration)
class SystemConfigurationAdmin(admin.ModelAdmin):
    list_display = ['project', 'num_panels', 'system_size_kwp', 'tilt_angle', 'azimuth_angle']
