from django.db import models
from django.conf import settings


class MarketOffer(models.Model):
    STATUS_CHOICES = (
        ('open', 'Ouvert'),
        ('accepted', 'Accepté'),
        ('cancelled', 'Annulé'),
        ('expired', 'Expiré'),
    )

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='vendeur', on_delete=models.CASCADE, related_name='market_offers', null=True, blank=True)
    title = models.CharField('titre', max_length=200, blank=True)
    description = models.TextField('description', blank=True)
    amount_requested = models.DecimalField('montant demandé', max_digits=20, decimal_places=2)
    price_offered = models.DecimalField('prix offert', max_digits=20, decimal_places=2)
    surplus = models.DecimalField('surplus', max_digits=20, decimal_places=2, default=0)
    source = models.CharField('source', max_length=32, default='virtual')
    status = models.CharField('statut', max_length=32, choices=STATUS_CHOICES, default='open')
    expires_at = models.DateTimeField('expire à', null=True, blank=True)
    created_at = models.DateTimeField('date de création', auto_now_add=True)

    class Meta:
        verbose_name = 'offre de marché'
        verbose_name_plural = 'offres de marché'

    def __str__(self):
        return f"Offer {self.pk}: {self.amount_requested} -> {self.price_offered} ({self.status})"


class Wallet(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='utilisateur', on_delete=models.CASCADE, related_name='wallets')
    currency = models.CharField('devise', max_length=10, default='CDF')
    available = models.DecimalField('disponible', max_digits=20, decimal_places=2, default=0)
    pending = models.DecimalField('en attente', max_digits=20, decimal_places=2, default=0)
    gains = models.DecimalField('gains', max_digits=20, decimal_places=2, default=0)
    sale_balance = models.DecimalField('solde de vente', max_digits=20, decimal_places=2, default=0)
    invested = models.DecimalField('solde investi', max_digits=20, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'portefeuille'
        verbose_name_plural = 'portefeuilles'

    def __str__(self):
        return f"Portefeuille {self.id} ({self.user}) - {self.currency}"


class Investor(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='investor')
    phone = models.CharField('téléphone', max_length=32, blank=True, null=True)
    total_invested = models.DecimalField('total investi', max_digits=20, decimal_places=2, default=0)
    portfolio_value = models.DecimalField('valeur du portefeuille', max_digits=20, decimal_places=2, default=0)
    vip_level = models.IntegerField('niveau VIP', default=0)
    vip_since = models.DateTimeField('VIP depuis', null=True, blank=True)
    created_at = models.DateTimeField('date de création', auto_now_add=True)

    class Meta:
        verbose_name = 'investisseur'
        verbose_name_plural = 'investisseurs'

    def __str__(self):
        return f"Investisseur {self.user.username}"


class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('deposit', 'Dépôt'),
        ('withdraw', 'Retrait'),
        ('trade', 'Échange'),
        ('referral', 'Parrainage'),
        ('transfer', 'Transfert'),
        ('interest', 'Intérêt'),
        ('encash', 'Encaissement'),
    )

    wallet = models.ForeignKey(Wallet, verbose_name='portefeuille', on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField('montant', max_digits=20, decimal_places=2)
    type = models.CharField('type de transaction', max_length=20, choices=TRANSACTION_TYPES)
    created_at = models.DateTimeField('date', auto_now_add=True)

    class Meta:
        verbose_name = 'transaction'
        verbose_name_plural = 'transactions'

    def __str__(self):
        return f"{self.get_type_display()} {self.amount} -> {self.wallet}"


class Deposit(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('awaiting_payment', 'En attente de paiement'),
        ('completed', 'Terminé'),
        ('failed', 'Échoué'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='utilisateur', on_delete=models.CASCADE, related_name='deposits')
    amount = models.DecimalField('montant', max_digits=20, decimal_places=2)
    currency = models.CharField('devise', max_length=10, default='XAF')
    status = models.CharField('statut', max_length=32, choices=STATUS_CHOICES, default='pending')
    external_id = models.CharField('id externe', max_length=128, blank=True, null=True)
    created_at = models.DateTimeField('date de création', auto_now_add=True)

    class Meta:
        verbose_name = 'dépôt'
        verbose_name_plural = 'dépôts'

    def __str__(self):
        return f"Dépôt {self.id} ({self.amount} {self.currency}) - {self.status}"


class Trade(models.Model):
    """Record of a market trade (acceptance of a virtual offer or matched order)."""
    offer_id = models.CharField('offer id', max_length=128)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='vendeur', on_delete=models.CASCADE, related_name='trades')
    amount = models.DecimalField('montant demandé', max_digits=20, decimal_places=2)
    price = models.DecimalField('prix offert', max_digits=20, decimal_places=2)
    surplus = models.DecimalField('surplus', max_digits=20, decimal_places=2)
    buyer_info = models.JSONField('acheteur', blank=True, null=True)
    created_at = models.DateTimeField('date', auto_now_add=True)

    class Meta:
        verbose_name = 'trade'
        verbose_name_plural = 'trades'

    def __str__(self):
        return f"Trade {self.id}: {self.seller} sold {self.amount} -> {self.price} (surplus {self.surplus})"


class ReferralCode(models.Model):
    """A referral code owned by a referrer user."""
    code = models.CharField('code', max_length=64, unique=True)
    referrer = models.OneToOneField(settings.AUTH_USER_MODEL, verbose_name='parrain', on_delete=models.CASCADE, related_name='referral_code')
    created_at = models.DateTimeField('date de création', auto_now_add=True)

    class Meta:
        verbose_name = 'code de parrainage'
        verbose_name_plural = 'codes de parrainage'

    def __str__(self):
        return f"{self.code} -> {self.referrer}"


class Referral(models.Model):
    STATUS = (
        ('pending', 'Pending'),
        ('used', 'Used'),
        ('cancelled', 'Cancelled'),
    )

    code = models.ForeignKey(ReferralCode, verbose_name='code', on_delete=models.CASCADE, related_name='referrals')
    referred_user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='filleul', on_delete=models.CASCADE, related_name='referred_by', null=True, blank=True)
    created_at = models.DateTimeField('date', auto_now_add=True)
    used_at = models.DateTimeField('utilisé le', null=True, blank=True)
    status = models.CharField('statut', max_length=32, choices=STATUS, default='pending')
    meta = models.JSONField('meta', null=True, blank=True)

    class Meta:
        verbose_name = 'parrainage'
        verbose_name_plural = 'parrainages'

    def __str__(self):
        return f"Referral {self.id} code={self.code.code} -> {self.referred_user} ({self.status})"


class ReferralReward(models.Model):
    """Record of a reward paid to the referrer when a referral meets conditions."""
    referral = models.ForeignKey(Referral, verbose_name='parrainage', on_delete=models.CASCADE, related_name='rewards')
    amount = models.DecimalField('montant', max_digits=20, decimal_places=2)
    transaction = models.ForeignKey(Transaction, verbose_name='transaction', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField('date', auto_now_add=True)

    class Meta:
        verbose_name = 'récompense de parrainage'
        verbose_name_plural = 'récompenses de parrainage'

    def __str__(self):
        return f"Reward {self.id} {self.amount} for referral {self.referral_id}"


class Investment(models.Model):
    """Represents a user's locked investment which accrues daily interest.

    The backend will not automatically move funds back to `available` unless
    an accrual or a withdrawal action is performed. Daily rate is stored as
    a decimal (e.g. 0.025 for 2.5% daily) to allow flexibility.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='utilisateur', on_delete=models.CASCADE, related_name='investments')
    wallet = models.ForeignKey(Wallet, verbose_name='portefeuille', on_delete=models.CASCADE, related_name='investments')
    amount = models.DecimalField('montant investi', max_digits=20, decimal_places=2)
    daily_rate = models.DecimalField('taux journalier', max_digits=10, decimal_places=6, default=0.025)
    last_accrual = models.DateTimeField('dernière capitalisation', null=True, blank=True)
    # accrued interest not yet encashed for this investment
    accrued = models.DecimalField('intérêts accumulés', max_digits=20, decimal_places=2, default=0)
    created_at = models.DateTimeField('date de création', auto_now_add=True)
    active = models.BooleanField('actif', default=True)

    class Meta:
        verbose_name = 'investissement'
        verbose_name_plural = 'investissements'

    def __str__(self):
        return f"Investment {self.id} {self.user} {self.amount} @ {self.daily_rate}"


class HiddenOffer(models.Model):
    """Mark a MarketOffer as hidden for a specific user until a given datetime.

    If `user` is null, the hidden marker is global (applies to all users).
    """
    offer = models.ForeignKey(MarketOffer, verbose_name='offre', on_delete=models.CASCADE, related_name='hidden_entries')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='utilisateur', on_delete=models.CASCADE, null=True, blank=True, related_name='hidden_offers')
    hidden_until = models.DateTimeField('masqué jusqu\'à')
    created_at = models.DateTimeField('date de création', auto_now_add=True)

    class Meta:
        verbose_name = 'offre masquée'
        verbose_name_plural = 'offres masquées'

    def __str__(self):
        return f"HiddenOffer offer={self.offer_id} user={self.user_id} until={self.hidden_until}"
