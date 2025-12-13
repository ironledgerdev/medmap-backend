from django.db.models.signals import post_save
from django.dispatch import receiver
from bookings.models import Booking
from .models import Notification

@receiver(post_save, sender=Booking)
def create_booking_notification(sender, instance, created, **kwargs):
    if created:
        # Notify Doctor
        if instance.doctor and instance.doctor.user:
            Notification.objects.create(
                recipient=instance.doctor.user,
                type='booking_created',
                title='New Booking Request',
                message=f"New booking from {instance.patient_name} on {instance.date} at {instance.time}",
                data={'booking_id': instance.id}
            )
        # Notify Patient (if user exists)
        if instance.user:
             Notification.objects.create(
                recipient=instance.user,
                type='booking_created',
                title='Booking Confirmation',
                message=f"Your booking with Dr. {instance.doctor.user.last_name} is pending approval.",
                data={'booking_id': instance.id}
            )
    else:
        # Status change
        if instance.status == 'confirmed':
            # Notify Patient
             if instance.user:
                Notification.objects.create(
                    recipient=instance.user,
                    type='booking_approved',
                    title='Booking Confirmed',
                    message=f"Your booking with Dr. {instance.doctor.user.last_name} has been confirmed.",
                    data={'booking_id': instance.id}
                )
        elif instance.status == 'cancelled':
             # Notify Patient
             if instance.user:
                Notification.objects.create(
                    recipient=instance.user,
                    type='booking_cancelled',
                    title='Booking Cancelled',
                    message=f"Your booking with Dr. {instance.doctor.user.last_name} was cancelled.",
                    data={'booking_id': instance.id}
                )
             # Notify Doctor if cancelled by patient (logic needed to distinguish who cancelled, but generally notify doctor too)
             if instance.doctor and instance.doctor.user:
                 Notification.objects.create(
                    recipient=instance.doctor.user,
                    type='booking_cancelled',
                    title='Booking Cancelled',
                    message=f"Booking with {instance.patient_name} was cancelled.",
                    data={'booking_id': instance.id}
                )
