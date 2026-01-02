from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from .models import Deposit, Referral, ReferralReward, Wallet, Transaction
from .utils import recompute_vip_for_user


@receiver(post_save, sender=Deposit)
def handle_deposit_completed(sender, instance: Deposit, created, **kwargs):
    # Trigger referral reward when a deposit becomes completed
    try:
        status = getattr(instance, 'status', None)
        if status != 'completed':
            return

        # minimum deposit threshold and reward amount from settings
        MIN = Decimal(getattr(settings, 'REFERRAL_MIN_DEPOSIT', '1000'))
        REWARD = Decimal(getattr(settings, 'REFERRAL_REWARD_AMOUNT', '1000'))

        if instance.amount < MIN:
            return

        # find referral record for this user
        referral = Referral.objects.filter(referred_user=instance.user).order_by('created_at').first()
        if not referral:
            return

        # don't pay twice
        if ReferralReward.objects.filter(referral=referral).exists():
            return

        referrer = referral.code.referrer

        # credit referrer's wallet in same currency
        try:
            with transaction.atomic():
                w = Wallet.objects.select_for_update().filter(user=referrer, currency=instance.currency).first()
                if not w:
                    # create a wallet for referrer if missing
                    w = Wallet.objects.create(user=referrer, currency=instance.currency, available=Decimal('0'), pending=Decimal('0'), gains=Decimal('0'))

                w.available = (w.available + REWARD).quantize(Decimal('0.01'))
                w.gains = (w.gains + REWARD).quantize(Decimal('0.01'))
                w.save()

                tx = Transaction.objects.create(wallet=w, amount=REWARD, type='referral')
                ReferralReward.objects.create(referral=referral, amount=REWARD, transaction=tx)

                referral.status = 'used'
                referral.used_at = timezone.now()
                referral.save()
                # After a deposit completes (and referral reward processed), recompute VIP
                try:
                    # use portfolio basis if configured in settings
                    recompute_vip_for_user(instance.user)
                except Exception:
                    # don't break deposit processing on VIP recompute errors
                    pass
    except Exception:
        # avoid crashing on errors in signal
        return
