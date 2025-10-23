# ai_wrapper.py

import os
import requests

OPENROUTER_KEY   = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/cypher-alpha:free")
OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"

class OpenRouterWrapper:
    def __init__(self, api_key=None, model=None, url=None, timeout=90):
        self.api_key  = api_key  or OPENROUTER_KEY
        self.model    = model    or OPENROUTER_MODEL
        self.url      = url      or OPENROUTER_URL
        self.timeout  = timeout
        if not self.api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")

    def generate(self, pages: list[str], system_prompt: str) -> dict:
        # 1) build messages
        messages = [{"role": "system", "content": system_prompt}]
        for i, pg in enumerate(pages, start=1):
            messages.append({
                "role":    "user",
                "content": f"--- Page {i} ---\n{pg}"
            })

        payload = {"model": self.model, "messages": messages}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json",
        }

        # 2) call OpenRouter
        resp = requests.post(self.url, json=payload, headers=headers, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()
