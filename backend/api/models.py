from django.db import models
from django.conf import settings


class MarketOffer(models.Model):
    title = models.CharField('titre', max_length=200)
    description = models.TextField('description', blank=True)
    price = models.DecimalField('prix', max_digits=16, decimal_places=2)
    created_at = models.DateTimeField('date de création', auto_now_add=True)

    class Meta:
        verbose_name = 'offre de marché'
        verbose_name_plural = 'offres de marché'

    def __str__(self):
        return f"{self.title} - {self.price}"


class Wallet(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='utilisateur', on_delete=models.CASCADE, related_name='wallets')
    currency = models.CharField('devise', max_length=10, default='XAF')
    available = models.DecimalField('disponible', max_digits=20, decimal_places=2, default=0)
    pending = models.DecimalField('en attente', max_digits=20, decimal_places=2, default=0)
    gains = models.DecimalField('gains', max_digits=20, decimal_places=2, default=0)

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
