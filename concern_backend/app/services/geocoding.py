import os
import requests


def get_coordinates(location_text: str):
    """Call LocationIQ directly. Returns (lat, lng) or (None, None)."""
    api_key = os.getenv("LOCATIONIQ_API_KEY")
    if not api_key:
        print("❌ Error: LOCATIONIQ_API_KEY is missing in .env")
        return None, None

    url = "https://us1.locationiq.com/v1/search.php"
    params = {
        'key': api_key,
        'q': location_text,
        'format': 'json',
        'limit': 1,
        'countrycodes': 'in',
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
        else:
            print(f"⚠️ API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠️ Geocoding request failed: {e}")

    return None, None