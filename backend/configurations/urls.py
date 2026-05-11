from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PanelSpecViewSet, InverterSpecViewSet, SystemConfigurationViewSet

router = DefaultRouter()
router.register(r'panels', PanelSpecViewSet, basename='panel-spec')
router.register(r'inverters', InverterSpecViewSet, basename='inverter-spec')
router.register(r'systems', SystemConfigurationViewSet, basename='system-config')

urlpatterns = [
    path('', include(router.urls)),
]
