from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, GlobalMetricsViewSet

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')
router.register(r'metrics/global', GlobalMetricsViewSet, basename='global-metrics')

urlpatterns = [
    path('', include(router.urls)),
]
