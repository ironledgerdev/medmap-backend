from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from bookings.models import Booking
from .models import Notification

User = get_user_model()

@receiver(post_save, sender=User)
def user_created(sender, instance, created, **kwargs):
    if created:
        # 1. Welcome Email to User
        try:
            send_mail(
                subject='Welcome to MedMap!',
                message=f'Hi {instance.first_name},\n\nWelcome to MedMap! We are excited to have you on board.\n\nBest regards,\nThe MedMap Team',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send welcome email: {e}")

        # 2. Notification to Admin
        admin_users = User.objects.filter(is_superuser=True)
        for admin in admin_users:
            Notification.objects.create(
                recipient=admin,
                type='user_registered',
                title='New User Registration',
                message=f'New user registered: {instance.first_name} {instance.last_name} ({instance.email})',
                data={'user_id': instance.id}
            )

@receiver(post_save, sender=Booking)
def booking_created(sender, instance, created, **kwargs):
    if created:
        # 1. Email to Patient
        try:
            send_mail(
                subject='Booking Confirmation',
                message=f'Hi {instance.patient.first_name},\n\nYour appointment with Dr. {instance.doctor.user.last_name} on {instance.appointment_date} at {instance.appointment_time} has been booked.\n\nStatus: {instance.status}\n\nBest regards,\nThe MedMap Team',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.patient.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send booking email to patient: {e}")

        # 2. Email to Doctor
        try:
            send_mail(
                subject='New Appointment Booking',
                message=f'Hi Dr. {instance.doctor.user.last_name},\n\nYou have a new appointment with {instance.patient.first_name} {instance.patient.last_name} on {instance.appointment_date} at {instance.appointment_time}.\n\nBest regards,\nThe MedMap Team',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.doctor.user.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send booking email to doctor: {e}")

        # 3. Notification to Admin
        admin_users = User.objects.filter(is_superuser=True)
        for admin in admin_users:
            Notification.objects.create(
                recipient=admin,
                type='booking_created',
                title='New Booking',
                message=f'New booking: {instance.patient.first_name} with Dr. {instance.doctor.user.last_name}',
                data={'booking_id': instance.id}
            )

        # 4. In-app Notification to Doctor
        Notification.objects.create(
            recipient=instance.doctor.user,
            type='booking_created',
            title='New Appointment',
            message=f'New appointment with {instance.patient.first_name} {instance.patient.last_name}',
            data={'booking_id': instance.id}
        )
