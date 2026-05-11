from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SiteAnalysisViewSet

router = DefaultRouter()
router.register(r'', SiteAnalysisViewSet, basename='site-analysis')

urlpatterns = [
    path('', include(router.urls)),
]
