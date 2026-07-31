from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    """Anything the brain can call to get a completion. Keeps the provider
    swappable (Mistral now, anything later). See DESIGN §8. `model` is an
    optional per-call override so the same provider instance can hit different
    models (e.g., a cheap gate model + a stronger main model in the chain)."""

    def complete(self, messages: list[dict], json_mode: bool = False, model: str | None = None) -> str: ...
