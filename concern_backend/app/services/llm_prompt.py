# app/services/llm_prompt.py

CONCERN_EXTRACTION_PROMPT = """
You are an expert entity extractor for a civic issue reporting system in Pune, India.
Extract the following information from the text below into a valid JSON object.

{language_hint}

Fields required:
- what: (string) A concise title of the issue in English (e.g., "Water shortage", "Large pothole", "Broken streetlight").
- location: (object) with fields: sub_locality, locality, city, state, country. Infer from context if possible, otherwise null.
- time_hint: (string) Any mention of time (e.g., "since yesterday", "2 hours ago"). If none, null.
- estimated_incident_timestamp: (string ISO 8601 or null) Best estimate of when the issue occurred.
- confidence: (float) Between 0.0 and 1.0. How confident are you in the extraction quality?
- urgency_score: (float) Between 0.0 and 1.0. How urgent is this issue?
  Use these guidelines for urgency_score:
  - 0.9–1.0: Immediate danger (fallen electric pole, flooding, fire, gas leak)
  - 0.7–0.9: Serious but not life-threatening (major road damage, broken water main)
  - 0.4–0.6: Moderate (recurring pothole, garbage overflow, streetlight out)
  - 0.1–0.3: Minor (cosmetic damage, minor cleanliness issue)
  - 0.0: Unclear urgency

RULES:
1. Output ONLY valid JSON. No explanations, no markdown.
2. If information is missing, use null.
3. Always translate the "what" field to English even if input is Hindi or Marathi.
4. Location fields should use standard English place names.

Text to process:
"{user_text}"
"""
