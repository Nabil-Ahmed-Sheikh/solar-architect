from django.contrib import admin
from .models import ROIAnalysis, YearlyProjection

class YearlyInline(admin.TabularInline):
    model = YearlyProjection
    extra = 0

@admin.register(ROIAnalysis)
class ROIAnalysisAdmin(admin.ModelAdmin):
    list_display = ['project', 'name', 'payback_years', 'irr_pct', 'lifetime_savings_usd']
    inlines = [YearlyInline]
