from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model
from api.models import Wallet, Investor
from api.utils import country_code_to_currency
import re


class Command(BaseCommand):
    help = 'Update existing wallets currency based on investor phone country code (e.g. +243 -> CDF)'

    def handle(self, *args, **options):
        User = get_user_model()
        users = User.objects.all()
        updated = 0
        for u in users:
            try:
                inv = getattr(u, 'investor', None)
                if not inv:
                    continue
                phone = (inv.phone or '').strip()
                cc = None
                if phone.startswith('+'):
                    m = re.match(r'^\+(\d{1,3})', phone)
                    if m:
                        cc = m.group(1)
                else:
                    m = re.match(r'^(\d{3})', phone)
                    if m:
                        cc = m.group(1)

                currency = country_code_to_currency(cc) if cc else getattr(settings, 'DEFAULT_CURRENCY', 'XAF')
                # update all wallets for this user to the detected currency
                qs = Wallet.objects.filter(user=u)
                if qs.exists():
                    qs.update(currency=currency)
                    updated += 1
                    self.stdout.write(f"Updated user={u.username} wallets -> {currency}")
            except Exception as e:
                self.stderr.write(f"Failed for user={u.username}: {e}")

        self.stdout.write(self.style.SUCCESS(f"Completed. Updated wallets for {updated} users."))
