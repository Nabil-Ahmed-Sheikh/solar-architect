from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LiDARScanViewSet

router = DefaultRouter()
router.register(r'scans', LiDARScanViewSet, basename='lidar-scan')

urlpatterns = [path('', include(router.urls))]
