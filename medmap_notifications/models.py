from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Notification(models.Model):
    TYPES = (
        ('booking_created', 'Booking Created'),
        ('booking_approved', 'Booking Approved'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('user_registered', 'User Registered'),
        ('doctor_approved', 'Doctor Approved'),
        ('system', 'System'),
    )

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=50, choices=TYPES, default='system')
    title = models.CharField(max_length=255)
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} - {self.recipient}"
