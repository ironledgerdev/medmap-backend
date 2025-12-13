import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    # 1. Login to get token (using a known user or creating one)
    # We will try to use ironledgerdev@gmail.com
    # Assuming password is "temp_password_change_me" or "password123"
    
    print("--- Testing Login ---")
    login_data = {
        "username": "ironledgerdev@gmail.com",
        "password": "temp_password_change_me"
    }
    
    # Try login
    response = requests.post(f"{BASE_URL}/token/", json=login_data)
    
    if response.status_code != 200:
        print("Login failed with temp_password_change_me, trying password123")
        login_data["password"] = "password123"
        response = requests.post(f"{BASE_URL}/token/", json=login_data)

    if response.status_code != 200:
        print(f"Login failed: {response.status_code} {response.text}")
        # Try creating a test user if login fails? Or just fail.
        # Let's try to verify doctors without token if possible, but viewset says IsAuthenticatedOrReadOnly
        token = None
    else:
        token = response.json().get("access")
        print("Login successful")

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # 2. Fetch Doctors
    print("\n--- Testing Doctors Endpoint ---")
    try:
        # even if token is None, ReadOnly should work
        resp = requests.get(f"{BASE_URL}/doctors/doctors/", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                print(f"Doctors count (list): {len(data)}")
                if len(data) > 0:
                    first_doc = data[0]
                    print("First doctor sample keys:", list(first_doc.keys()))
                    print("User details:", first_doc.get('user_details'))
                    print("Price:", first_doc.get('price'))
                    print("Speciality:", first_doc.get('speciality'))
            elif isinstance(data, dict) and 'results' in data:
                print(f"Doctors count (paginated): {data['count']}")
                if data['results']:
                    first_doc = data['results'][0]
                    print("First doctor sample keys:", list(first_doc.keys()))
            else:
                print("Unknown response format")
                print(data)
        else:
            print(f"Failed to fetch doctors: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Exception fetching doctors: {e}")

    # 3. Test Password Change (if logged in)
    if token:
        print("\n--- Testing Password Change ---")
        # We won't actually change it to something unknown, we'll change it to the SAME password or something known
        # But since we don't know the current password for sure (we just guessed it), let's skip actual change to avoid locking out.
        # We will just check if the endpoint exists (OPTIONS or just check our code).
        # Actually, let's try to hit it with wrong old password to verify validation.
        
        change_data = {
            "old_password": "wrong_password",
            "new_password": "new_password123"
        }
        resp = requests.post(f"{BASE_URL}/users/change_password/", json=change_data, headers=headers)
        print(f"Change Password Response (expect 400): {resp.status_code}")
        print(f"Response Body: {resp.text}")

if __name__ == "__main__":
    run_tests()
