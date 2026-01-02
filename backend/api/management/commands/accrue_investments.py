from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal, ROUND_DOWN
from django.db import transaction

class Command(BaseCommand):
    help = 'Accrue daily interest for all active investments'

    def handle(self, *args, **options):
        Investment = __import__('api.models', fromlist=['Investment']).Investment
        Wallet = __import__('api.models', fromlist=['Wallet']).Wallet
        Transaction = __import__('api.models', fromlist=['Transaction']).Transaction

        now = timezone.now()
        investments = Investment.objects.filter(active=True)
        total_interest = Decimal('0')
        count = 0
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
                        try:
                            w.gains = (w.gains + interest).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                        except Exception:
                            w.gains = interest
                        w.save()
                        Transaction.objects.create(wallet=w, amount=interest, type='deposit')

                    inv.last_accrual = now
                    inv.save()
                    total_interest += interest
                    count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed for inv {inv.id}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Accrued interest for {count} investments. Total interest: {total_interest}'))
