import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def login(email, password):
    url = f"{BASE_URL}/token/"
    try:
        response = requests.post(url, json={"username": email, "password": password})
        if response.status_code == 200:
            return response.json()["access"]
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error logging in: {e}")
        return None

def test_bulk_delete(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get a doctor (we know there are some from previous test)
    # We'll use the first one found or create one if needed, but let's list doctors first
    print("Fetching doctors...")
    resp = requests.get(f"{BASE_URL}/doctors/doctors/", headers=headers)
    if resp.status_code != 200:
        print("Failed to fetch doctors")
        return

    doctors_data = resp.json()
    if isinstance(doctors_data, dict) and 'results' in doctors_data:
        doctors = doctors_data['results']
    elif isinstance(doctors_data, list):
        doctors = doctors_data
    else:
        print(f"Unexpected response format: {type(doctors_data)}")
        return

    if not doctors:
        print("No doctors found to test with.")
        return

    doctor_id = doctors[0]['id']
    print(f"Testing with Doctor ID: {doctor_id}")

    # 2. Create a schedule
    print("Creating a test schedule...")
    schedule_data = {
        "doctor": doctor_id,
        "day_of_week": 1,
        "start_time": "09:00",
        "end_time": "17:00",
        "is_available": True
    }
    resp = requests.post(f"{BASE_URL}/doctors/schedules/", json=schedule_data, headers=headers)
    if resp.status_code not in [200, 201]:
        print(f"Failed to create schedule: {resp.text}")
        # Proceeding anyway as there might be existing schedules
    else:
        print("Schedule created.")

    # 3. Verify schedule exists
    resp = requests.get(f"{BASE_URL}/doctors/schedules/?doctor={doctor_id}", headers=headers)
    schedule_data = resp.json()
    if isinstance(schedule_data, list):
        count_before = len(schedule_data)
    else:
        count_before = schedule_data.get('count', 0)
    
    print(f"Schedules before delete: {count_before}")

    if count_before == 0:
        print("No schedules to delete, skipping test.")
        return

    # 4. Bulk Delete
    print("Executing Bulk Delete...")
    resp = requests.delete(f"{BASE_URL}/doctors/schedules/bulk_delete/?doctor={doctor_id}", headers=headers)
    
    if resp.status_code == 200:
        print(f"Bulk delete response: {resp.json()}")
    else:
        print(f"Bulk delete failed: {resp.status_code} - {resp.text}")
        return

    # 5. Verify empty
    resp = requests.get(f"{BASE_URL}/doctors/schedules/?doctor={doctor_id}", headers=headers)
    schedule_data = resp.json()
    if isinstance(schedule_data, list):
        count_after = len(schedule_data)
    else:
        count_after = schedule_data.get('count', 0)
    
    print(f"Schedules after delete: {count_after}")

    if count_after == 0:
        print("SUCCESS: Schedules deleted.")
    else:
        print("FAILURE: Schedules still exist.")

def main():
    print("Logging in as admin...")
    token = login("admin", "admin")
    if token:
        test_bulk_delete(token)

if __name__ == "__main__":
    main()
