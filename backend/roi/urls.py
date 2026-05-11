from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ROIAnalysisViewSet

router = DefaultRouter()
router.register(r'analyses', ROIAnalysisViewSet, basename='roi-analysis')
urlpatterns = [path('', include(router.urls))]
