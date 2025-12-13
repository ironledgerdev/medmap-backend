import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000/api"

def print_status(name, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {name}: {details}")

def test_search_doctors():
    try:
        response = requests.get(f"{BASE_URL}/doctors/doctors/")
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', data)
            print_status("Search Doctors", True, f"Found {len(results)} doctors")
        else:
            print_status("Search Doctors", False, f"Status {response.status_code}")
    except Exception as e:
        print_status("Search Doctors", False, str(e))

def test_payments_endpoint():
    try:
        # Just check if the endpoint is accessible (even if 401/403 for protected routes)
        # Transactions is admin only, so we expect 401 or 403 without token
        response = requests.get(f"{BASE_URL}/payments/transactions/")
        if response.status_code in [200, 401, 403]:
            print_status("Payments Transactions Endpoint", True, f"Status {response.status_code} (Expected 401/403/200)")
        else:
            print_status("Payments Transactions Endpoint", False, f"Status {response.status_code}")
            
        # Notify endpoint (POST only, but checking existence)
        response = requests.get(f"{BASE_URL}/payments/notify/")
        if response.status_code == 405: # Method not allowed (Good, means endpoint exists)
            print_status("PayFast Notify Endpoint", True, "Exists (405 Method Not Allowed on GET)")
        else:
             print_status("PayFast Notify Endpoint", False, f"Status {response.status_code}")
    except Exception as e:
        print_status("Payments Endpoint", False, str(e))

def test_notifications_endpoint():
    try:
        response = requests.get(f"{BASE_URL}/notifications/notifications/")
        # Expect 401 because we are not authenticated
        if response.status_code == 401:
            print_status("Notifications Endpoint", True, "Protected (401 Unauthorized)")
        elif response.status_code == 200:
            print_status("Notifications Endpoint", True, "Accessible")
        else:
            print_status("Notifications Endpoint", False, f"Status {response.status_code}")
    except Exception as e:
        print_status("Notifications Endpoint", False, str(e))

def test_bookings_availability():
    try:
        # Check taken_slots endpoint
        response = requests.get(f"{BASE_URL}/bookings/bookings/taken_slots/?doctor=1&date=2025-01-01")
        if response.status_code == 200:
             print_status("Taken Slots Endpoint", True, "Accessible")
        else:
             print_status("Taken Slots Endpoint", False, f"Status {response.status_code}")
    except Exception as e:
        print_status("Taken Slots Endpoint", False, str(e))

if __name__ == "__main__":
    print("--- MedMap Backend Verification ---")
    test_search_doctors()
    test_payments_endpoint()
    test_notifications_endpoint()
    test_bookings_availability()
    print("-----------------------------------")
