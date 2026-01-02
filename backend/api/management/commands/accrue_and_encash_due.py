from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal, ROUND_DOWN
from django.db import transaction
from datetime import timedelta


class Command(BaseCommand):
    help = 'Accrue interest for active investments and encash accrued interest older than 24h'

    def handle(self, *args, **options):
        Investment = __import__('api.models', fromlist=['Investment']).Investment
        Wallet = __import__('api.models', fromlist=['Wallet']).Wallet
        Transaction = __import__('api.models', fromlist=['Transaction']).Transaction

        now = timezone.now()
        accrued_total = Decimal('0')
        encashed_total = Decimal('0')
        accrued_count = 0
        encashed_count = 0

        # 1) Accrue interest for investments with >=1 full day since last_accrual
        investments = Investment.objects.filter(active=True)
        for inv in investments.select_for_update():
            last = inv.last_accrual or inv.created_at
            delta = now - last
            days = delta.days
            if days < 1:
                continue
            try:
                with transaction.atomic():
                    w = Wallet.objects.select_for_update().get(pk=inv.wallet.pk)
                    daily = Decimal(str(inv.daily_rate))
                    principal = Decimal(str(inv.amount))
                    interest = (principal * daily * Decimal(days)).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                    if interest > 0:
                        # add to investment.accrued and wallet.gains
                        try:
                            inv.accrued = (inv.accrued + interest).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                        except Exception:
                            inv.accrued = interest
                        try:
                            w.gains = (w.gains + interest).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                        except Exception:
                            w.gains = interest
                        w.save()
                        Transaction.objects.create(wallet=w, amount=interest, type='interest')
                        inv.last_accrual = now
                        inv.save()
                        accrued_total += interest
                        accrued_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Accrual failed for inv {inv.id}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Accrued interest for {accrued_count} investments. Total interest added: {accrued_total}'))

        # 2) Encash accrued interest older than 24 hours (per-investment)
        cutoff = now - timedelta(hours=24)
        due_investments = Investment.objects.filter(accrued__gt=0, last_accrual__lte=cutoff)
        for inv in due_investments.select_for_update():
            try:
                with transaction.atomic():
                    w = Wallet.objects.select_for_update().get(pk=inv.wallet.pk)
                    amount = Decimal(str(inv.accrued or 0))
                    if amount <= Decimal('0'):
                        continue
                    # ensure wallet has gains to cover (consistency)
                    if w.gains < amount:
                        # log and skip this investment
                        self.stdout.write(self.style.WARNING(f'Wallet gains insufficient for inv {inv.id}: gains={w.gains} accrued={amount}'))
                        continue
                    w.gains = (w.gains - amount).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                    w.available = (w.available + amount).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                    w.save()

                    Transaction.objects.create(wallet=w, amount=amount, type='encash')

                    inv.accrued = Decimal('0')
                    inv.last_accrual = now
                    inv.save()

                    encashed_total += amount
                    encashed_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Encash failed for inv {inv.id}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Encashed interest for {encashed_count} investments. Total encashed: {encashed_total}'))
