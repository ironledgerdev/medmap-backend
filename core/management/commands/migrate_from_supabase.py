from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os
import requests
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Migrate users from Supabase Auth API and user_roles table'

    def handle(self, *args, **kwargs):
        supabase_url = os.environ.get('SUPABASE_URL')
        service_role_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

        if not supabase_url or not service_role_key:
            self.stdout.write(self.style.ERROR('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env'))
            return

        headers = {
            'apikey': service_role_key,
            'Authorization': f'Bearer {service_role_key}',
            'Content-Type': 'application/json'
        }

        # 1. Fetch Users
        users_url = f"{supabase_url}/auth/v1/admin/users"
        self.stdout.write(f"Fetching users from {users_url}...")
        try:
            response = requests.get(users_url, headers=headers)
            if response.status_code != 200:
                self.stdout.write(self.style.ERROR(f"Failed to fetch users: {response.text}"))
                return
            
            data = response.json()
            users_list = data.get('users', []) if isinstance(data, dict) else data
            self.stdout.write(f"Found {len(users_list)} users.")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error fetching users: {e}"))
            return

        # 2. Fetch User Roles
        roles_url = f"{supabase_url}/rest/v1/user_roles?select=*"
        self.stdout.write(f"Fetching roles from {roles_url}...")
        roles_map = {} # user_id -> role_name
        try:
            response = requests.get(roles_url, headers=headers)
            if response.status_code == 200:
                roles_data = response.json()
                self.stdout.write(f"Found {len(roles_data)} role assignments.")
                for r in roles_data:
                    roles_map[r['user_id']] = r['role']
            else:
                self.stdout.write(self.style.WARNING(f"Failed to fetch roles: {response.text}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error fetching roles: {e}"))

        # 3. Process Migration
        for item in users_list:
            email = item.get('email')
            user_id = item.get('id')
            
            if not email:
                continue
            
            # Determine Role
            role = roles_map.get(user_id)
            
            # Fetch or Create User
            user, created = User.objects.get_or_create(
                username=email,
                defaults={
                    'email': email,
                    'password': 'temp_password_change_me'
                }
            )
            
            if created:
                action = "Created"
            else:
                action = "Updated"
            
            # Update Fields
            # Default to False unless specified
            user.is_doctor = False
            user.is_patient = False
            user.is_superuser = False
            user.is_staff = False

            if role == 'doctor':
                user.is_doctor = True
            elif role == 'patient':
                user.is_patient = True
            elif role == 'admin':
                user.is_superuser = True
                user.is_staff = True
            
            # Also check metadata for phone/name
            metadata = item.get('user_metadata', {}) or {}
            user.phone_number = item.get('phone', '') or metadata.get('phone_number', '') or user.phone_number
            
            if 'full_name' in metadata:
                parts = metadata['full_name'].split(' ', 1)
                user.first_name = parts[0]
                if len(parts) > 1:
                    user.last_name = parts[1]
            
            user.save()
            
            self.stdout.write(f"{action} user: {email} | Role: {role if role else 'None'}")
