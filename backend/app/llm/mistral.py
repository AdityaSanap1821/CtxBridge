"""Mistral provider.

TODO(owner: B — The Brain): implement using the mistralai SDK. Sketch:

    from mistralai import Mistral

    class MistralProvider:
        def __init__(self, api_key, model):
            self.client = Mistral(api_key=api_key)
            self.model = model

        def complete(self, messages, json_mode=False):
            kwargs = {"model": self.model, "messages": messages}
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            resp = self.client.chat.complete(**kwargs)
            return resp.choices[0].message.content
"""


class MistralProvider:
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def complete(self, messages: list[dict], json_mode: bool = False) -> str:
        raise NotImplementedError("MistralProvider.complete not implemented yet")
