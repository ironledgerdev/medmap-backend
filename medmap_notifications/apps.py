from django.apps import AppConfig

class MedmapNotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'medmap_notifications'

    def ready(self):
        import medmap_notifications.signals
