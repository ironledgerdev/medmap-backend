import os
import requests
import json
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medmap_backend.settings')
django.setup()

def inspect_supabase_users():
    supabase_url = os.environ.get('SUPABASE_URL')
    service_role_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not service_role_key:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.")
        return

    headers = {
        'apikey': service_role_key,
        'Authorization': f'Bearer {service_role_key}',
        'Content-Type': 'application/json'
    }
    
    users_url = f"{supabase_url}/auth/v1/admin/users"
    
    print(f"Fetching users from {users_url}...")
    try:
        response = requests.get(users_url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch users: {response.status_code} {response.text}")
            return

        data = response.json()
        users = data.get('users', []) if isinstance(data, dict) else data
        
        print(f"\nFound {len(users)} users. inspecting metadata for first 5 users:\n")
        
        for i, user in enumerate(users[:5]):
            print(f"--- User {i+1}: {user.get('email')} ---")
            print("user_metadata:", json.dumps(user.get('user_metadata', {}), indent=2))
            print("app_metadata:", json.dumps(user.get('app_metadata', {}), indent=2))
            print("\n")

    except Exception as e:
        print(f"Exception occurred: {e}")

if __name__ == "__main__":
    inspect_supabase_users()
