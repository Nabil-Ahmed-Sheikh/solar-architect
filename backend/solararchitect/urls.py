from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health(request):
    return JsonResponse({"status": "ok", "version": "2.0"})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health),
    # Auth endpoints (login, register, me, change-password, logout)
    path('api/auth/', include('authentication.urls')),
    # Data endpoints
    path('api/projects/', include('projects.urls')),
    path('api/sites/', include('sites.urls')),
    path('api/configurations/', include('configurations.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/lidar/', include('lidar.urls')),
    path('api/roi/', include('roi.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
