import requests
BASE_URL = "http://127.0.0.1:8000/api"
def get_token():
    url = f"{BASE_URL}/token/"
    try:
        response = requests.post(url, json={"username": "admin_test", "password": "admin_test_password"})
        if response.status_code == 200:
            print(response.json()['access'])
        else:
            print(f"Error: {response.status_code}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    get_token()
