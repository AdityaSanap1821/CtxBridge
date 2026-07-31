from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    """Anything the brain can call to get a completion. Keeps the provider
    swappable (Mistral now, anything later). See DESIGN §8."""

    def complete(self, messages: list[dict], json_mode: bool = False) -> str: ...
