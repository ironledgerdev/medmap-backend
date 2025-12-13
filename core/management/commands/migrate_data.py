from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from doctors.models import Doctor
from bookings.models import Booking
from memberships.models import Membership
import os
import requests
import json
from datetime import datetime

User = get_user_model()

class Command(BaseCommand):
    help = 'Migrate data (Doctors, Bookings, Memberships) from Supabase'

    def handle(self, *args, **kwargs):
        supabase_url = os.environ.get('SUPABASE_URL')
        service_role_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

        if not supabase_url or not service_role_key:
            self.stdout.write(self.style.ERROR('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env'))
            return

        headers = {
            'apikey': service_role_key,
            'Authorization': f'Bearer {service_role_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

        # 1. Build User Map (Supabase UUID -> Django User)
        self.stdout.write("Fetching Supabase users to build map...")
        users_url = f"{supabase_url}/auth/v1/admin/users"
        try:
            response = requests.get(users_url, headers=headers)
            if response.status_code != 200:
                self.stdout.write(self.style.ERROR(f"Failed to fetch users: {response.text}"))
                return
            
            sb_users = response.json().get('users', [])
            uuid_to_user = {}
            for u in sb_users:
                email = u.get('email')
                if email:
                    try:
                        django_user = User.objects.get(email=email)
                        uuid_to_user[u['id']] = django_user
                    except User.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f"User {email} not found in Django DB"))
            
            self.stdout.write(f"Mapped {len(uuid_to_user)} users.")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error fetching users: {e}"))
            return

        # 2. Migrate Doctors
        self.stdout.write("Migrating Doctors...")
        try:
            # Assuming 'doctors' table in Supabase has columns matching or similar
            # user_id is likely a UUID referencing auth.users
            response = requests.get(f"{supabase_url}/rest/v1/doctors?select=*", headers=headers)
            doctors_data = response.json()
            
            for d in doctors_data:
                user_id = d.get('user_id') or d.get('user') # check column name
                if not user_id or user_id not in uuid_to_user:
                    self.stdout.write(self.style.WARNING(f"Doctor skipped (unknown user): {d.get('id')}"))
                    continue
                
                django_user = uuid_to_user[user_id]
                
                # Check if doctor profile exists
                doctor, created = Doctor.objects.get_or_create(user=django_user)
                
                # Update fields
                doctor.speciality = d.get('speciality') or 'General Practitioner'
                doctor.city = d.get('city') or ''
                doctor.province = d.get('province') or ''
                doctor.price = d.get('price') or d.get('consultation_fee') or 0.00
                doctor.years_experience = d.get('years_experience') or 0
                doctor.bio = d.get('bio') or ''
                doctor.verified = d.get('verified', False)
                
                # Image URL handling (Supabase likely stores full URL or path)
                image_url = d.get('image_url') or d.get('image')
                # We can't easily download and save the image here without more work, 
                # so we'll skip image migration or store the URL in a temporary field if we had one.
                # For now, skip image.
                
                doctor.save()
                
                # If 'languages' is a field in Supabase, handle it
                if 'languages' in d:
                    doctor.languages = d['languages']
                    doctor.save()
                    
                status_str = "Created" if created else "Updated"
                self.stdout.write(f"{status_str} Doctor profile for {django_user.email}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error migrating doctors: {e}"))

        # 3. Migrate Bookings
        self.stdout.write("Migrating Bookings...")
        try:
            response = requests.get(f"{supabase_url}/rest/v1/bookings?select=*", headers=headers)
            bookings_data = response.json()
            
            for b in bookings_data:
                patient_id = b.get('patient_id') or b.get('user_id')
                doctor_id_sb = b.get('doctor_id') # This might be the doctor TABLE id, or user id
                
                if not patient_id or patient_id not in uuid_to_user:
                    continue

                patient_user = uuid_to_user[patient_id]
                
                # Resolve Doctor
                # If doctor_id_sb refers to the 'doctors' table ID (integer usually in Supabase public schema if auto-inc)
                # We need to find the corresponding Django Doctor. 
                # BUT, we don't know the Supabase Doctor ID -> Django Doctor ID mapping.
                # If Supabase doctor_id is a UUID (user_id), we can map it.
                # If it's an int, we might need to assume order or fetch doctor by user_id.
                
                # Heuristic: Try to find a Django Doctor whose user matches the Supabase Doctor's user
                # We need to fetch the Supabase Doctor record to get their User ID if we only have Doctor ID.
                # OR we build a map of Supabase Doctor ID -> Django Doctor Object.
                
                # Let's build Supabase Doctor ID -> Django Doctor map
                # We can do this by re-iterating the doctors_data we fetched above.
                
                pass # Logic continues below

            # Build SB Doctor ID Map
            sb_doctor_id_map = {} # sb_id -> django_doctor_obj
            for d in doctors_data:
                u_id = d.get('user_id') or d.get('user')
                if u_id in uuid_to_user:
                    d_user = uuid_to_user[u_id]
                    try:
                        doc_obj = Doctor.objects.get(user=d_user)
                        sb_doctor_id_map[d['id']] = doc_obj
                    except Doctor.DoesNotExist:
                        pass
            
            # Now process bookings
            for b in bookings_data:
                patient_id = b.get('patient_id') or b.get('user_id')
                doctor_id_sb = b.get('doctor_id')
                
                if patient_id not in uuid_to_user:
                    continue
                if doctor_id_sb not in sb_doctor_id_map:
                    continue
                    
                patient_user = uuid_to_user[patient_id]
                doctor_obj = sb_doctor_id_map[doctor_id_sb]
                
                # Create Booking
                # Handle Date/Time
                date_str = b.get('appointment_date')
                time_str = b.get('appointment_time')
                
                if not date_str or not time_str:
                    continue
                
                booking, created = Booking.objects.get_or_create(
                    user=patient_user,
                    doctor=doctor_obj,
                    appointment_date=date_str,
                    appointment_time=time_str,
                    defaults={
                        'status': b.get('status', 'pending'),
                        'notes': b.get('notes') or b.get('patient_notes') or ''
                    }
                )
                if created:
                    self.stdout.write(f"Created Booking: {patient_user} with {doctor_obj}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error migrating bookings: {e}"))

        # 4. Migrate Memberships
        self.stdout.write("Migrating Memberships...")
        try:
            response = requests.get(f"{supabase_url}/rest/v1/memberships?select=*", headers=headers)
            memberships_data = response.json()
            
            for m in memberships_data:
                user_id = m.get('user_id')
                if not user_id or user_id not in uuid_to_user:
                    continue
                
                user = uuid_to_user[user_id]
                
                Membership.objects.update_or_create(
                    user=user,
                    defaults={
                        'tier': m.get('tier', 'free'),
                        'status': m.get('status', 'active'),
                        'start_date': m.get('start_date') or datetime.now(),
                        'end_date': m.get('end_date')
                    }
                )
                self.stdout.write(f"Updated Membership for {user.email}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error migrating memberships: {e}"))
