import sys
import os
from dotenv import load_dotenv

# Force it to look in the current folder
load_dotenv(os.path.join(os.getcwd(), ".env"))

# 2. Setup path so Python can find your 'app' folder
sys.path.append(os.getcwd())

from app.services.geocoding import get_coordinates

def test_geocoding():
    # Test cases: meaningful locations in Pune/India
    test_locations = [
        "Hinjewadi Phase 1, Pune",
        "Wakad, Pune",
        "Gateway of India, Mumbai",
        "SB Plaza, Shivtirthnagar, Kothrud"
    ]

    print("🌍 Testing LocationIQ Geocoding...\n")

    for loc_text in test_locations:
        print(f"🔎 Looking up: {loc_text} ...")
        
        lat, lng = get_coordinates(loc_text)
        
        if lat and lng:
            print(f"   ✅ FOUND: {lat}, {lng}")
        else:
            print(f"   ❌ FAILED: Could not find coordinates")
        
        print("-" * 30)

if __name__ == "__main__":
    test_geocoding()