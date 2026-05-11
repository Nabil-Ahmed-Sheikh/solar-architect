from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EnergyReportViewSet

router = DefaultRouter()
router.register(r'', EnergyReportViewSet, basename='energy-report')

urlpatterns = [
    path('', include(router.urls)),
]
