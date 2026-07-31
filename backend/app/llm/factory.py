from ..config import LLM_MODEL, LLM_PROVIDER, MISTRAL_API_KEY
from .mistral import MistralProvider


def get_provider():
    """Return a configured provider, or None if the key is missing.

    A None return lets /explain respond with a clear 503 instead of crashing.
    See DESIGN §8, §9.
    """
    if LLM_PROVIDER == "mistral":
        if not MISTRAL_API_KEY:
            return None
        return MistralProvider(MISTRAL_API_KEY, LLM_MODEL)
    raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}")
