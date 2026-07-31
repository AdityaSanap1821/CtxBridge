from mistralai.client import Mistral

# 15s hard cap per DESIGN §9: fast failure beats a spinning popover.
REQUEST_TIMEOUT_MS = 15_000


class MistralProvider:
    def __init__(self, api_key: str, model: str):
        self.client = Mistral(api_key=api_key, timeout_ms=REQUEST_TIMEOUT_MS)
        self.model = model

    def complete(self, messages: list[dict], json_mode: bool = False) -> str:
        kwargs: dict = {"model": self.model, "messages": messages}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = self.client.chat.complete(**kwargs)
        return resp.choices[0].message.content
