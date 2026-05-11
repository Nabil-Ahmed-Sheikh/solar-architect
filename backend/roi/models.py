from django.db import models
from projects.models import Project


class ROIAnalysis(models.Model):
    """25-year financial return model for a solar installation."""

    LOAN_TERM_CHOICES = [(15, '15 Years'), (20, '20 Years'), (25, '25 Years')]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='roi_analyses')
    name = models.CharField(max_length=200, default='ROI Analysis')

    # System parameters
    system_size_kwp = models.FloatField(default=10)
    system_cost_usd = models.FloatField(default=35000, help_text='Total installed cost')
    annual_production_kwh = models.FloatField(default=12000)
    panel_degradation_pct = models.FloatField(default=0.5, help_text='%/year')

    # Incentives
    federal_itc_pct = models.FloatField(default=30, help_text='Federal ITC %')
    provincial_rebate_usd = models.FloatField(default=0)
    srec_revenue_annual_usd = models.FloatField(default=0)

    # Financing
    loan_amount_usd = models.FloatField(default=0, help_text='0 = cash purchase')
    loan_interest_rate_pct = models.FloatField(default=5.5)
    loan_term_years = models.IntegerField(choices=LOAN_TERM_CHOICES, default=20)

    # Utility
    current_utility_rate_kwh = models.FloatField(default=0.18)
    utility_inflation_rate_pct = models.FloatField(default=3.5, help_text='Annual rate increase %')
    net_metering_rate_kwh = models.FloatField(default=0.10)

    # O&M
    annual_om_cost_usd = models.FloatField(default=200)

    # Computed outputs (populated by calculate())
    net_system_cost_usd = models.FloatField(default=0)
    payback_years = models.FloatField(default=0)
    irr_pct = models.FloatField(default=0)
    npv_usd = models.FloatField(default=0)
    lcoe_per_kwh = models.FloatField(default=0)
    lifetime_savings_usd = models.FloatField(default=0)
    lifetime_utility_cost_usd = models.FloatField(default=0)
    lifetime_solar_cost_usd = models.FloatField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ROI for {self.project.name} — payback {self.payback_years:.1f}yr"

    def calculate(self):
        """Run the 25-year financial model and populate output fields."""
        from .calculator import ROICalculator
        calc = ROICalculator(self)
        calc.run()


class YearlyProjection(models.Model):
    """Yearly cash flow projection row for an ROI analysis."""
    analysis = models.ForeignKey(ROIAnalysis, on_delete=models.CASCADE, related_name='yearly_projections')
    year = models.IntegerField()

    utility_cost_usd = models.FloatField()      # cost without solar
    solar_payout_usd = models.FloatField()       # annual loan payment + O&M
    net_savings_usd = models.FloatField()        # utility_cost - solar_payout
    cumulative_savings_usd = models.FloatField()
    generation_kwh = models.FloatField()
    utility_rate_kwh = models.FloatField()

    class Meta:
        ordering = ['year']
        unique_together = ['analysis', 'year']
