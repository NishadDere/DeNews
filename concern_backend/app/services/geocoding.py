import os
import requests

# ✅ ADD THIS LINE (Paste your actual key inside the quotes):
api_key = "pk.1058f8570d9c937c2e4f50877ccce52e"

def get_coordinates(location_text: str):
    """
    Direct API call to LocationIQ to avoid geopy version issues.
    """
    if not api_key:
        print("❌ Error: LOCATIONIQ_API_KEY is missing in .env")
        return None, None

    url = "https://us1.locationiq.com/v1/search.php"
    params = {
        'key': api_key,
        'q': location_text,
        'format': 'json',
        'limit': 1
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                # API returns strings, convert to float
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return lat, lon
        else:
            print(f"⚠️ API Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"⚠️ Geocoding request failed: {e}")
        
    return None, None