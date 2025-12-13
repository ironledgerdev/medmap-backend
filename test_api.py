import requests

try:
    response = requests.get('http://127.0.0.1:8000/api/doctors/doctors/')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
