import os
import json
from google import genai
from google.genai import types
from app.services.llm_prompt import CONCERN_EXTRACTION_PROMPT
from app.schemas import ExtractedConcern
import time

# Initialize client
api_key = os.getenv("GEMINI_API_KEY")
client  = genai.Client(api_key=api_key)


def clean_json_string(text: str) -> str:
    """Strip markdown code fences if Gemini wraps output in them."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


MODELS = [
    m.strip()
    for m in os.getenv("GEMINI_MODELS", "gemini-3.5-flash,gemini-flash-latest,gemini-2.5-flash").split(",")
    if m.strip()
]
RETRIES_PER_MODEL = 2
RETRYABLE = ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "500", "INTERNAL", "DEADLINE")


def call_llm_real(prompt: str) -> str:
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables.")

    last_error = None
    for model in MODELS:
        for attempt in range(RETRIES_PER_MODEL + 1):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.1),
                )
                return response.text
            except Exception as e:
                last_error = e
                msg = str(e)
                print(f"[llm] {model} attempt {attempt + 1} failed: {msg[:120]}")
                if any(k in msg for k in RETRYABLE) and attempt < RETRIES_PER_MODEL:
                    time.sleep(1.5 * (2 ** attempt))   # waits 1.5s, then 3s
                    continue
                break   # not retryable, or retries used up: try the next model
    raise last_error


def extract_concern_from_text(text: str, language: str = "en") -> ExtractedConcern:
    """
    Extracts structured concern data from raw user text.
    Now also extracts urgency_score (0.0–1.0).
    Passes language hint to the prompt so Gemini handles multilingual input correctly.
    """
    formatted_prompt = CONCERN_EXTRACTION_PROMPT.format(
        user_text=text,
        language_hint=_language_hint(language),
    )
    raw_response = call_llm_real(formatted_prompt)
    json_str = clean_json_string(raw_response)

    try:
        data = json.loads(json_str)
        return ExtractedConcern(**data)
    except json.JSONDecodeError:
        print(f"Failed to parse JSON. Raw output: {raw_response}")
        raise


def _language_hint(language: str) -> str:
    hints = {
        "en": "The text is in English.",
        "hi": "The text is in Hindi. Extract location and issue details accordingly.",
        "mr": "The text is in Marathi. Extract location and issue details accordingly.",
    }
    return hints.get(language, "The text may be in English, Hindi, or Marathi.")
