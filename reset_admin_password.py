import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medmap_backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

try:
    user = User.objects.get(username='admin')
    user.set_password('admin')
    user.save()
    print("Password for 'admin' has been set to 'admin'.")
except User.DoesNotExist:
    print("User 'admin' does not exist. Creating it now.")
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print("Superuser 'admin' created with password 'admin'.")
