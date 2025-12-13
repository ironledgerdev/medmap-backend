import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medmap_backend.settings')
django.setup()

from doctors.models import Doctor
from users.models import User
from rest_framework.test import APIRequestFactory
from doctors.views import DoctorViewSet
from users.views import UserViewSet

def test_list_doctors():
    print("Testing list doctors...")
    factory = APIRequestFactory()
    request = factory.get('/api/doctors/doctors/')
    view = DoctorViewSet.as_view({'get': 'list'})
    response = view(request)
    print(f"Status: {response.status_code}")
    if isinstance(response.data, list):
        print(f"Data count: {len(response.data)}")
    else:
        print(f"Data count: {len(response.data.get('results', response.data))}")
    # print(response.data)

def test_user_update_password():
    print("\nTesting user update password...")
    # Create a user
    email = "test_pass_user@example.com"
    if not User.objects.filter(email=email).exists():
        user = User.objects.create_user(username=email, email=email, password="old_password")
    else:
        user = User.objects.get(email=email)
        user.set_password("old_password")
        user.save()
        
    print(f"User created: {user.email}")
    
    # Update password via patch
    factory = APIRequestFactory()
    request = factory.patch(f'/api/users/{user.id}/', {'password': 'new_password'}, format='json')
    request.user = user # Simulate auth
    view = UserViewSet.as_view({'patch': 'partial_update'})
    
    # We need to force authentication
    from rest_framework.test import force_authenticate
    force_authenticate(request, user=user)
    
    response = view(request, pk=user.id)
    print(f"Update Status: {response.status_code}")
    
    user.refresh_from_db()
    if user.check_password("new_password"):
        print("Password update successful!")
    else:
        print("Password update failed!")

if __name__ == "__main__":
    test_list_doctors()
    test_user_update_password()
