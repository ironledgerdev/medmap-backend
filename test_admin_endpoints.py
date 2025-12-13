import requests
import json
import os
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
ADMIN_EMAIL = "admin@example.com" # Replace with actual admin credentials if known or create one
ADMIN_PASSWORD = "adminpassword" # Replace with actual admin password

def login(email, password):
    print(f"Logging in as {email}...")
    url = f"{BASE_URL}/token/"
    try:
        response = requests.post(url, json={"username": email, "password": password})
        if response.status_code == 200:
            print("Login successful.")
            return response.json()['access']
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_admin_stats(token):
    print("\nTesting Admin Stats Endpoint...")
    url = f"{BASE_URL}/system/settings/admin_stats/"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            print("Admin stats retrieved successfully:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Failed to get admin stats: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error testing admin stats: {e}")

def test_user_search(token, query):
    print(f"\nTesting User Search for '{query}'...")
    url = f"{BASE_URL}/users/?search={query}"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            print(f"Search results for '{query}':")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Search failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error testing user search: {e}")

def main():
    token = login("admin", "admin")
    if token:
        test_admin_stats(token)
        # test_user_search(token, "admin")

if __name__ == "__main__":
    main()
