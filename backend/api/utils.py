from decimal import Decimal
from django.conf import settings
from django.db.models import Sum, F


def country_code_to_currency(country_code: str) -> str:
    """Map a phone country code (like '+243' or '243') to a currency code.

    Defaults to 'XAF' unless the code matches known mappings (e.g. '+243' -> 'CDF').
    """
    if not country_code:
        return getattr(settings, 'DEFAULT_CURRENCY', 'XAF')
    cc = str(country_code).strip()
    # normalize: remove leading + if present
    if cc.startswith('+'):
        cc = cc[1:]

    # mapping: you can extend this as needed
    mapping = {
        '243': 'CDF',  # DR Congo
    }

    return mapping.get(cc, getattr(settings, 'DEFAULT_CURRENCY', 'XAF'))


def compute_vip_level(total_amount):
    """Compute VIP level using doubling thresholds starting at base.

    This version is usable from multiple places; `total_amount` may be Decimal or numeric.
    """
    if total_amount is None:
        return 0
    try:
        t = Decimal(str(total_amount))
    except Exception:
        return 0

    base = Decimal(getattr(settings, 'VIP_FIRST_THRESHOLD', 25000))
    level = 0
    threshold = base
    while t >= threshold:
        level += 1
        threshold = threshold * Decimal(2)
    return level


def recompute_vip_for_user(user):
    """Recompute and persist the VIP level for a user based on current invested balances.

    Returns the new level.
    """
    from .models import Wallet, Investor
    # By default, compute from invested balances. If settings.VIP_USE_PORTFOLIO is true,
    # compute from the total portfolio (available + invested + gains) across wallets.
    use_portfolio = bool(getattr(settings, 'VIP_USE_PORTFOLIO', False))
    if use_portfolio:
        # compute total as available + invested + gains across wallets
        agg = Wallet.objects.filter(user=user).aggregate(total=Sum(F('available') + F('invested') + F('gains')))
        total = agg.get('total') or Decimal('0')
    else:
        # sum invested across all wallets for the user
        agg = Wallet.objects.filter(user=user).aggregate(total=Sum('invested'))
        total = agg.get('total') or Decimal('0')

    level = compute_vip_level(total)

    try:
        inv = Investor.objects.select_for_update().filter(user=user).first()
        if not inv:
            inv = Investor.objects.create(user=user)
        # store the basis used for the VIP (keep total_invested for backwards compatibility)
        # Per request, persist `total_invested` as the sum of available balances
        avail_agg = Wallet.objects.filter(user=user).aggregate(total=Sum('available'))
        available_total = avail_agg.get('total') or Decimal('0')
        inv.total_invested = available_total
        if level != (inv.vip_level or 0):
            from django.utils import timezone
            inv.vip_level = level
            inv.vip_since = timezone.now()
        inv.save()
    except Exception:
        # best-effort; do not raise
        pass

    return level
