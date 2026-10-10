import os
import sys
from dotenv import load_dotenv

# 1. Load environment variables (API Key)
load_dotenv()

# 2. Setup path to allow importing from 'app'
# This allows you to run the script directly if needed
sys.path.append(os.getcwd())

from app.services.llm_extractor import extract_concern_from_text

def test_real_llm_extraction():
    # A sample user report
    sample_text = "Major traffic jam at Hinjewadi Phase 1 flyover due to a broken down truck since 5 PM."
    
    print(f"🔹 INPUT: {sample_text}")
    print("... Calling Gemini API ...")

    try:
        # Call the extractor
        result = extract_concern_from_text(sample_text)
        
        # Print the result
        print("\n✅ SUCCESS! Extracted Data:")
        print(result.model_dump_json(indent=2))
        
        # logical checks
        if result.location and result.location.sub_locality:
            print(f"\n📍 Extracted Location: {result.location.sub_locality}")
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")

if __name__ == "__main__":
    test_real_llm_extraction()