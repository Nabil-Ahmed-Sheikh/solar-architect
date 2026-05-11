from django.contrib import admin
from .models import EnergyReport, MonthlyGeneration


class MonthlyGenerationInline(admin.TabularInline):
    model = MonthlyGeneration
    extra = 0


@admin.register(EnergyReport)
class EnergyReportAdmin(admin.ModelAdmin):
    list_display = ['project', 'report_year', 'total_generation_kwh', 'savings_usd', 'performance_ratio']
    inlines = [MonthlyGenerationInline]
