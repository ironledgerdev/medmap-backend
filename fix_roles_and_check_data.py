import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medmap_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from doctors.models import Doctor

User = get_user_model()

def fix_roles():
    print("Fixing roles...")
    
    # Fix ironledgerdev
    try:
        dev = User.objects.get(email='ironledgerdev@gmail.com')
        dev.is_superuser = True
        dev.is_staff = True
        dev.is_doctor = True # Assuming dev wants to test doctor features
        dev.save()
        print(f"Promoted {dev.email} to superuser/staff/doctor")
        
        # Ensure doctor profile exists for dev
        Doctor.objects.get_or_create(
            user=dev,
            defaults={
                'speciality': 'General Practitioner',
                'city': 'Johannesburg',
                'province': 'Gauteng',
                'price': 500.00,
                'bio': 'Developer Account'
            }
        )
        print("Ensured doctor profile for ironledgerdev")
        
    except User.DoesNotExist:
        print("ironledgerdev@gmail.com not found")

    # Fix users with no role
    no_role = User.objects.filter(is_patient=False, is_doctor=False, is_superuser=False, is_staff=False)
    print(f"Found {no_role.count()} users with no role")
    
    for u in no_role:
        # Default to patient
        u.is_patient = True
        u.save()
        print(f"Set {u.email} to patient")

if __name__ == '__main__':
    fix_roles()
