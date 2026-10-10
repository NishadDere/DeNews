"""
Embedding service — generates 768-dimensional semantic vectors
using Gemini's text-embedding-004 model.

These embeddings capture the *meaning* of a concern description,
allowing us to match "broken road near bus stop" with
"huge pothole outside Swargate" as the same issue.
"""
import os
from google import genai

api_key = os.getenv("GEMINI_API_KEY")
client  = genai.Client(api_key=api_key)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768  # must specify output_dimensionality, see below

def generate_embedding(text: str) -> list[float]:
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables.")

    try:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
            config={"output_dimensionality": EMBEDDING_DIM},
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"[embedding] Gemini embedding error: {e}")
        raise e

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    Returns a float between -1.0 and 1.0 (higher = more similar).
    Used as a fallback when pgvector is unavailable.
    """
    dot   = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = sum(a * a for a in vec_a) ** 0.5
    mag_b = sum(b * b for b in vec_b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)