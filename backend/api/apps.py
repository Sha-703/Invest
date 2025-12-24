from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # import signals to register handlers
        try:
            from . import signals  # noqa: F401
        except Exception:
            pass
