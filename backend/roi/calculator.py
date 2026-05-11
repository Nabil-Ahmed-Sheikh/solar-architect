"""
ROI Calculator Engine
=====================
25-year NPV / IRR / LCOE / payback model for solar installations.
"""
import math


class ROICalculator:
    """Financial model for a solar installation."""

    ANALYSIS_YEARS = 25
    DISCOUNT_RATE = 0.06   # 6% for NPV

    def __init__(self, analysis):
        self.a = analysis

    def run(self):
        """Compute all financial metrics and persist them."""
        from roi.models import YearlyProjection

        a = self.a

        # Net system cost after incentives
        itc = a.system_cost_usd * (a.federal_itc_pct / 100)
        net_cost = a.system_cost_usd - itc - a.provincial_rebate_usd
        a.net_system_cost_usd = round(net_cost, 2)

        # Annual loan payment (PMT formula)
        if a.loan_amount_usd > 0 and a.loan_interest_rate_pct > 0:
            r = (a.loan_interest_rate_pct / 100) / 12
            n = a.loan_term_years * 12
            monthly_payment = a.loan_amount_usd * r / (1 - (1 + r) ** -n)
            annual_payment = monthly_payment * 12
        else:
            annual_payment = 0

        is_persisted = hasattr(a, 'pk') and a.pk is not None
        if is_persisted:
            YearlyProjection.objects.filter(analysis=a).delete()

        projections = []
        cumulative = -net_cost    # Start with the initial investment as negative
        payback_year = None
        cashflows = [-net_cost]   # Year 0 investment
        total_gen = 0

        for yr in range(1, self.ANALYSIS_YEARS + 1):
            # Degraded production
            degrade = (1 - a.panel_degradation_pct / 100) ** (yr - 1)
            gen_kwh = a.annual_production_kwh * degrade
            total_gen += gen_kwh

            # Utility rate with inflation
            util_rate = a.current_utility_rate_kwh * ((1 + a.utility_inflation_rate_pct / 100) ** (yr - 1))

            # Utility cost without solar
            util_cost = gen_kwh * util_rate

            # Solar system cost this year
            solar_payout = annual_payment + a.annual_om_cost_usd
            # SREC revenue
            solar_payout -= a.srec_revenue_annual_usd

            net_savings = util_cost - solar_payout
            cumulative += net_savings
            cashflows.append(net_savings)

            if payback_year is None and cumulative >= 0:
                # Interpolate exact payback
                prev_cum = cumulative - net_savings
                frac = abs(prev_cum) / net_savings if net_savings != 0 else 0
                payback_year = yr - 1 + frac

            row_data = dict(
                year=yr,
                utility_cost_usd=round(util_cost, 2),
                solar_payout_usd=round(solar_payout, 2),
                net_savings_usd=round(net_savings, 2),
                cumulative_savings_usd=round(cumulative, 2),
                generation_kwh=round(gen_kwh, 1),
                utility_rate_kwh=round(util_rate, 4),
            )
            if is_persisted:
                projections.append(YearlyProjection(analysis=a, **row_data))
            else:
                projections.append(type('Projection', (), row_data)())

        if is_persisted:
            YearlyProjection.objects.bulk_create(projections)
        else:
            a.yearly_projections = projections

        # IRR (Newton-Raphson)
        a.irr_pct = round(self._irr(cashflows) * 100, 2)

        # NPV
        a.npv_usd = round(self._npv(cashflows, self.DISCOUNT_RATE), 2)

        # LCOE = Net system cost / Total lifetime generation
        a.lcoe_per_kwh = round(net_cost / total_gen, 4) if total_gen > 0 else 0

        # Lifetime savings
        a.lifetime_savings_usd = round(cumulative, 2)
        a.payback_years = round(payback_year if payback_year is not None else self.ANALYSIS_YEARS, 1)

        # Lifetime utility spend (no solar)
        lifetime_util = sum(
            a.current_utility_rate_kwh * ((1 + a.utility_inflation_rate_pct / 100) ** (yr - 1)) * a.annual_production_kwh
            for yr in range(1, self.ANALYSIS_YEARS + 1)
        )
        a.lifetime_utility_cost_usd = round(lifetime_util, 2)
        a.lifetime_solar_cost_usd = round(net_cost + annual_payment * a.loan_term_years + a.annual_om_cost_usd * self.ANALYSIS_YEARS, 2)

        if is_persisted:
            a.save()

    @staticmethod
    def _npv(cashflows, rate):
        return sum(cf / (1 + rate) ** t for t, cf in enumerate(cashflows))

    @staticmethod
    def _irr(cashflows, max_iter=1000, tol=1e-6):
        """Newton–Raphson IRR."""
        rate = 0.1
        for _ in range(max_iter):
            npv = sum(cf / (1 + rate) ** t for t, cf in enumerate(cashflows))
            dnpv = sum(-t * cf / (1 + rate) ** (t + 1) for t, cf in enumerate(cashflows))
            if abs(dnpv) < 1e-10:
                break
            new_rate = rate - npv / dnpv
            if abs(new_rate - rate) < tol:
                return new_rate
            rate = max(-0.99, min(new_rate, 10))
        return rate
