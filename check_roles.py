import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medmap_backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print(f"{'Email':<35} | {'Role':<15} | {'Phone':<15}")
print("-" * 70)

for user in User.objects.all():
    role = []
    if user.is_superuser:
        role.append("Superuser")
    if user.is_doctor:
        role.append("Doctor")
    if user.is_patient:
        role.append("Patient")
    
    role_str = ", ".join(role) if role else "None"
    
    print(f"{user.email:<35} | {role_str:<15} | {user.phone_number if user.phone_number else 'N/A':<15}")
