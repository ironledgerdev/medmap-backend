import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medmap_backend.settings')
django.setup()

from doctors.models import Doctor, DoctorSchedule

def run():
    print("Checking multi-schedule capability...")
    doctor = Doctor.objects.first()
    if not doctor:
        print("No doctor found")
        return

    # Clear schedules for Sunday (day 0)
    DoctorSchedule.objects.filter(doctor=doctor, day_of_week=0).delete()

    print("Creating Morning Shift (09:00 - 12:00)")
    s1 = DoctorSchedule.objects.create(
        doctor=doctor,
        day_of_week=0,
        start_time='09:00',
        end_time='12:00',
        is_available=True
    )
    print(f"Created s1: {s1.id}")

    print("Creating Afternoon Shift (13:00 - 17:00)")
    try:
        s2 = DoctorSchedule.objects.create(
            doctor=doctor,
            day_of_week=0,
            start_time='13:00',
            end_time='17:00',
            is_available=True
        )
        print(f"Created s2: {s2.id}")
        print("SUCCESS: Multiple schedules created for same day.")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    run()
