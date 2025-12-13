import os
import django
import sys

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medmap_backend.settings')
django.setup()

from doctors.models import Doctor
from users.models import User

print("Checking Users and Doctors...")

users = User.objects.all()
print(f"Total Users: {users.count()}")

doctors = Doctor.objects.all()
print(f"Total Doctors: {doctors.count()}")

for doctor in doctors:
    print(f"Doctor: {doctor.user.email}, Speciality: {doctor.speciality}, Price: {doctor.price}")

if doctors.count() == 0:
    print("No doctors found! Creating a test doctor...")
    # Find a user to make a doctor or create one
    try:
        user = User.objects.get(email='ironledgerdev@gmail.com')
    except User.DoesNotExist:
        user = User.objects.create_user(
            email='doctor@example.com',
            username='doctor@example.com',
            password='password123',
            first_name='Test',
            last_name='Doctor',
            is_doctor=True
        )
    
    Doctor.objects.create(
        user=user,
        speciality='General Practitioner',
        city='Johannesburg',
        province='Gauteng',
        price=500.00,
        bio='A test doctor.'
    )
    print("Test doctor created.")
