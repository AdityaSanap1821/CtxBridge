import os

from dotenv import load_dotenv

# Loads backend/.env when the server is started from the backend/ directory.
load_dotenv()

# Fixed role list for the MVP (no role inference). See DESIGN.md §4.
ROLES = ["Sales", "Marketing", "Design", "Engineering", "Product"]

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mistral")
LLM_MODEL = os.getenv("LLM_MODEL", "mistral-small-latest")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

# backend/ (two levels up from this file: app/config.py -> app -> backend)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "ctxbridge.db")
