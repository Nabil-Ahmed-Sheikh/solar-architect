from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings

from .models import LiDARScan, RoofSegment, ShadingObstacle
from .serializers import (
    LiDARScanSerializer, LiDARScanListSerializer,
    RoofSegmentSerializer, ShadingObstacleSerializer,
)


# ── Celery task (optional — falls back to sync if Celery not running) ────

def run_pipeline_task(scan_id: int):
    """Run the LiDAR pipeline. Called via Celery or synchronously."""
    from .pipeline import LiDARPipeline
    pipeline = LiDARPipeline(scan_id)
    pipeline.run()


try:
    from celery import shared_task

    @shared_task(bind=True, max_retries=2)
    def run_pipeline_celery(self, scan_id: int):
        run_pipeline_task(scan_id)

    HAS_CELERY = True
except ImportError:
    HAS_CELERY = False


class LiDARScanViewSet(viewsets.ModelViewSet):
    """
    CRUD for LiDAR scans. POST triggers the processing pipeline.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = LiDARScan.objects.select_related('project').prefetch_related(
            'dsm_tile', 'roof_segments', 'obstacles'
        )
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return LiDARScanListSerializer
        return LiDARScanSerializer

    def create(self, request, *args, **kwargs):
        """Create a scan and immediately kick off the processing pipeline."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scan = serializer.save()

        # Launch pipeline
        try:
            if HAS_CELERY:
                run_pipeline_celery.delay(scan.id)
            else:
                # Synchronous fallback (blocks request — OK for dev)
                import threading
                t = threading.Thread(target=run_pipeline_task, args=(scan.id,))
                t.daemon = True
                t.start()
        except Exception as e:
            scan.status = 'failed'
            scan.status_message = str(e)
            scan.save(update_fields=['status', 'status_message'])

        headers = self.get_success_headers(serializer.data)
        return Response(
            LiDARScanSerializer(scan).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Poll scan processing status."""
        scan = self.get_object()
        return Response({
            'id': scan.id,
            'status': scan.status,
            'progress_pct': scan.progress_pct,
            'status_message': scan.status_message,
            'segment_count': scan.roof_segments.count(),
        })

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """Re-trigger the pipeline for a failed or outdated scan."""
        scan = self.get_object()
        scan.status = 'pending'
        scan.progress_pct = 0
        scan.status_message = 'Reprocessing…'
        scan.save(update_fields=['status', 'progress_pct', 'status_message'])

        try:
            if HAS_CELERY:
                run_pipeline_celery.delay(scan.id)
            else:
                import threading
                t = threading.Thread(target=run_pipeline_task, args=(scan.id,))
                t.daemon = True
                t.start()
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        return Response({'status': 'reprocessing', 'id': scan.id})

    @action(detail=True, methods=['get'])
    def segments(self, request, pk=None):
        """Return all roof segments for this scan."""
        scan = self.get_object()
        segs = scan.roof_segments.all()
        return Response(RoofSegmentSerializer(segs, many=True).data)

    @action(detail=True, methods=['get'])
    def obstacles(self, request, pk=None):
        """Return all detected obstacles for this scan."""
        scan = self.get_object()
        obs = scan.obstacles.all()
        return Response(ShadingObstacleSerializer(obs, many=True).data)

    @action(detail=True, methods=['get'])
    def dsm_grid(self, request, pk=None):
        """Return the DSM elevation grid (downsampled) for 3D visualisation."""
        scan = self.get_object()
        try:
            tile = scan.dsm_tile
            return Response({
                'width': tile.width_px,
                'height': tile.height_px,
                'resolution_m': tile.resolution_m,
                'grid': tile.get_elevation_grid(),
                'elevation_min': scan.elevation_min,
                'elevation_max': scan.elevation_max,
            })
        except Exception:
            return Response({'error': 'DSM not yet generated'}, status=404)

    @action(detail=False, methods=['get'])
    def google_maps_key(self, request):
        """Return the Google Maps API key for the frontend."""
        key = settings.GOOGLE_MAPS_API_KEY
        return Response({'key': key, 'available': bool(key)})
