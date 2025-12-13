from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom User model for MedMap.
    Distinguishes between Patients, Doctors, and Admins.
    """
    is_patient = models.BooleanField(default=False)
    is_doctor = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    # Address/Contact info could go here or in a separate Profile model
    
    def __str__(self):
        return self.email if self.email else self.username
