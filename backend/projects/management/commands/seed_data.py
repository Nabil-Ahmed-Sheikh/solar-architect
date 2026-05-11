"""
Management command to seed the database with sample data.
Run: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from projects.models import Project, GlobalMetrics
from sites.models import SiteAnalysis, ShadeProfile
from configurations.models import PanelSpec, InverterSpec, SystemConfiguration
from reports.models import EnergyReport, MonthlyGeneration
from authentication.models import UserProfile


PROJECTS = [
    {
        "name": "Greenway Logistics Hub",
        "location": "San Jose, CA",
        "status": "ACTIVE",
        "roof_area": 12400,
        "estimated_generation": 482,
        "latitude": 37.3382,
        "longitude": -121.8863,
    },
    {
        "name": "North Ridge Residential",
        "location": "Austin, TX",
        "status": "PENDING",
        "roof_area": 4150,
        "estimated_generation": 156,
        "latitude": 30.2672,
        "longitude": -97.7431,
    },
    {
        "name": "Summit Retail Plaza",
        "location": "Denver, CO",
        "status": "COMPLETED",
        "roof_area": 8900,
        "estimated_generation": 310,
        "latitude": 39.7392,
        "longitude": -104.9903,
    },
    {
        "name": "Harbor District A3",
        "location": "Seattle, WA",
        "status": "PENDING",
        "roof_area": 1820,
        "estimated_generation": 62,
        "latitude": 47.6062,
        "longitude": -122.3321,
    },
]

MONTHLY_GENERATION = [380, 420, 510, 580, 640, 720, 750, 710, 620, 530, 410, 360]
MONTHLY_CONSUMPTION = [450, 430, 400, 370, 360, 350, 340, 345, 360, 400, 440, 470]
MONTHLY_IRRADIANCE = [2.8, 3.4, 4.5, 5.6, 6.2, 6.8, 7.1, 6.9, 5.8, 4.6, 3.2, 2.5]


class Command(BaseCommand):
    help = 'Seed the database with SolarArchitect sample data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding data...')

        # Create superuser
        if not User.objects.filter(username='admin').exists():
            admin = User.objects.create_superuser(
                'admin', 'admin@solararchitect.io', 'admin123',
                first_name='Alex', last_name='Chen'
            )
            UserProfile.objects.update_or_create(
                user=admin,
                defaults={
                    'title': 'Lead Solar Engineer',
                    'organization': 'Helios Technical Suite',
                    'bio': '10+ years in utility-scale and residential PV design.',
                    'phone': '+1 (416) 555-0192',
                    'total_mw_designed': 142.5,
                }
            )
            self.stdout.write(self.style.SUCCESS('  ✓ Created admin user (admin / admin123)'))

        # Create a regular test user too
        if not User.objects.filter(username='engineer').exists():
            eng = User.objects.create_user(
                'engineer', 'engineer@solararchitect.io', 'engineer123',
                first_name='Jordan', last_name='Lee'
            )
            UserProfile.objects.update_or_create(
                user=eng,
                defaults={
                    'title': 'Junior Solar Engineer',
                    'organization': 'Helios Technical Suite',
                    'total_mw_designed': 12.3,
                }
            )
            self.stdout.write(self.style.SUCCESS('  ✓ Created test user (engineer / engineer123)'))

        # Global metrics
        GlobalMetrics.objects.get_or_create(
            defaults={
                'total_generation_gwh': 1.42,
                'generation_change_pct': 12.4,
                'active_installations': 342,
                'estimated_savings_usd': 84200,
            }
        )
        self.stdout.write(self.style.SUCCESS('  ✓ Global metrics'))

        # Panel specs
        panel, _ = PanelSpec.objects.get_or_create(
            manufacturer='SunPower', model_name='Maxeon 6',
            defaults={'watt_peak': 440, 'length_mm': 1812, 'width_mm': 1046,
                      'efficiency_pct': 22.8, 'warranty_years': 40}
        )
        panel2, _ = PanelSpec.objects.get_or_create(
            manufacturer='LG', model_name='NeON R ACe',
            defaults={'watt_peak': 380, 'length_mm': 1740, 'width_mm': 1000,
                      'efficiency_pct': 21.7, 'warranty_years': 25}
        )

        # Inverter specs
        inverter, _ = InverterSpec.objects.get_or_create(
            manufacturer='SolarEdge', model_name='SE10K-RWS',
            defaults={'rated_power_kw': 10, 'efficiency_pct': 99.2, 'inverter_type': 'string'}
        )

        # Projects
        for pd in PROJECTS:
            proj, created = Project.objects.get_or_create(name=pd['name'], defaults={**pd})
            if created:
                self.stdout.write(f'  ✓ Project: {proj.name}')

            # Site analysis
            if not hasattr(proj, 'site_analysis'):
                site = SiteAnalysis.objects.create(
                    project=proj,
                    address=pd['location'],
                    latitude=pd['latitude'],
                    longitude=pd['longitude'],
                    peak_sun_hours=2100,
                    irradiance_zone='High',
                    roof_type='flat',
                    roof_pitch_degrees=5,
                    roof_orientation_degrees=180,
                    usable_roof_area=pd['roof_area'] * 0.85,
                    total_roof_area=pd['roof_area'],
                    utility_provider='Pacific Gas & Electric',
                    current_rate_kwh=0.28,
                    annual_consumption_kwh=pd['estimated_generation'] * 1000 * 0.9,
                    net_metering_available=True,
                    current_step=3,
                )
                for month in range(1, 13):
                    ShadeProfile.objects.create(site=site, month=month, shading_factor=round(0.02 * (month % 3), 3))

            # System configuration
            if not hasattr(proj, 'configuration'):
                num_panels = int(pd['roof_area'] * 0.85 / (1.812 * 1.046))
                SystemConfiguration.objects.create(
                    project=proj,
                    panel_spec=panel,
                    inverter_spec=inverter,
                    num_panels=num_panels,
                    num_strings=max(1, num_panels // 10),
                    panels_per_string=10,
                    system_size_kwp=round(num_panels * 440 / 1000, 1),
                    tilt_angle=20,
                    azimuth_angle=180,
                    layout_data={'rows': 10, 'cols': max(1, num_panels // 10)},
                )

            # Energy report
            report, _ = EnergyReport.objects.get_or_create(
                project=proj, report_year=2024,
                defaults={
                    'total_generation_kwh': pd['estimated_generation'] * 1000,
                    'total_consumption_kwh': pd['estimated_generation'] * 1000 * 0.9,
                    'net_export_kwh': pd['estimated_generation'] * 1000 * 0.1,
                    'co2_avoided_kg': pd['estimated_generation'] * 1000 * 0.45,
                    'savings_usd': pd['estimated_generation'] * 1000 * 0.28,
                    'revenue_usd': pd['estimated_generation'] * 1000 * 0.28 * 0.1,
                    'performance_ratio': 0.82,
                    'capacity_factor': 18.5,
                }
            )
            if not report.monthly_data.exists():
                factor = pd['estimated_generation'] / sum(MONTHLY_GENERATION) * 1000
                for i, (gen, cons, irr) in enumerate(
                    zip(MONTHLY_GENERATION, MONTHLY_CONSUMPTION, MONTHLY_IRRADIANCE), 1
                ):
                    MonthlyGeneration.objects.create(
                        report=report, month=i,
                        generation_kwh=round(gen * factor, 1),
                        consumption_kwh=round(cons * factor, 1),
                        irradiance_kwh_m2=irr,
                        peak_power_kw=round(gen * factor / 160, 1),
                    )

        self.stdout.write(self.style.SUCCESS('\n✅ Seed complete!'))
