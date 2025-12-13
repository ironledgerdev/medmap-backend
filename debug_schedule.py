import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medmap_backend.settings')
django.setup()

from doctors.models import Doctor, DoctorSchedule
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

def run():
    print("Checking doctors...")
    doctors = Doctor.objects.all()
    if not doctors.exists():
        print("No doctors found.")
        return

    doctor = doctors.first()
    print(f"Using doctor: {doctor} (ID: {doctor.id})")

    # Clear schedules
    print("Clearing schedules...")
    DoctorSchedule.objects.filter(doctor=doctor).delete()
    print(f"Schedules count after clear: {DoctorSchedule.objects.filter(doctor=doctor).count()}")

    # Try to create a schedule via ORM
    print("Creating schedule via ORM...")
    try:
        sch = DoctorSchedule.objects.create(
            doctor=doctor,
            day_of_week=0, # Sunday
            start_time='09:00',
            end_time='17:00',
            is_available=True
        )
        print(f"Created schedule: {sch.id}")
    except Exception as e:
        print(f"ORM Create failed: {e}")

    # Try to create another one for same day (should fail)
    print("Creating duplicate schedule via ORM...")
    try:
        DoctorSchedule.objects.create(
            doctor=doctor,
            day_of_week=0,
            start_time='18:00',
            end_time='20:00',
            is_available=True
        )
        print("Duplicate created (Unexpected!)")
    except Exception as e:
        print(f"Duplicate failed as expected: {e}")

    # Now test API
    print("Testing API...")
    client = APIClient()
    client.force_authenticate(user=doctor.user)
    
    # Test Bulk Delete
    print("Testing Bulk Delete API...")
    # First create some schedules
    DoctorSchedule.objects.create(doctor=doctor, day_of_week=2, start_time='09:00', end_time='17:00')
    DoctorSchedule.objects.create(doctor=doctor, day_of_week=3, start_time='09:00', end_time='17:00')
    print(f"Schedules before bulk delete: {DoctorSchedule.objects.filter(doctor=doctor).count()}")
    
    del_response = client.delete(f'/api/doctors/schedules/bulk_delete/?doctor={doctor.id}')
    print(f"Bulk Delete Response: {del_response.status_code}")
    print(f"Bulk Delete Content: {del_response.content}")
    print(f"Schedules after bulk delete: {DoctorSchedule.objects.filter(doctor=doctor).count()}")

    # Post a new schedule for Monday
    data = {
        "doctor": doctor.id,
        "day_of_week": 1,
        "start_time": "09:00",
        "end_time": "17:00",
        "is_available": True
    }
    
    response = client.post('/api/doctors/schedules/', data, format='json')
    print(f"API Response Status: {response.status_code}")
    print(f"API Response Content: {response.content}")

if __name__ == "__main__":
    run()
