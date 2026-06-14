"""
inference.py — robust multi-provider LLM calls for the AutoSoil pipeline.

Adapted from the inference layer in the Odysseus project
(github.com/pewdiepie-archdaemon/odysseus, src/llm_core.py): provider
auto-detection from the endpoint URL, an ordered fallback chain across
providers, transient-error retries, and tolerant response parsing.
Reimplemented compactly here with no dependencies beyond httpx + the stdlib.

Why it exists: the original pipeline made a single, unguarded DeepSeek call and
json.loads()'d the raw content — so a markdown-fenced reply, a rate-limit, or a
missing key collapsed the whole borehole draft to one "UNKNOWN ROCK" unit. This
layer tries multiple providers in order, retries transient failures, and
extracts JSON even when the model wraps it in prose or code fences.
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Optional
from urllib.parse import urlparse

import httpx

DEFAULT_TIMEOUT = 60.0
MAX_RETRIES = 2
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


# --------------------------------------------------------------------------- #
# provider detection + request shaping (ported/condensed from Odysseus)
# --------------------------------------------------------------------------- #
def detect_provider(url: str) -> str:
    parsed = urlparse(url or "")
    host = (parsed.hostname or "").lower()
    if "anthropic.com" in host:
        return "anthropic"
    if "openrouter.ai" in host:
        return "openrouter"
    if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} or parsed.port == 11434:
        return "local"  # Ollama OpenAI-compat / llama.cpp / LM Studio
    return "openai"  # DeepSeek, OpenAI, Groq, Together, … are all OpenAI-shaped


def _headers(provider: str, api_key: Optional[str]) -> dict:
    h = {"Content-Type": "application/json"}
    if api_key:
        if provider == "anthropic":
            h["x-api-key"] = api_key
            h["anthropic-version"] = "2023-06-01"
        else:
            h["Authorization"] = f"Bearer {api_key}"
    if provider == "openrouter":
        h.setdefault("HTTP-Referer", "https://github.com/jeevanreddy23/Auto-Soil-Logger-Project-1")
        h.setdefault("X-Title", "AutoSoil Logger")
    return h


def _consolidate_system(messages: list[dict]) -> list[dict]:
    sys = [m.get("content", "") for m in messages if m.get("role") == "system"]
    rest = [m for m in messages if m.get("role") != "system"]
    if sys:
        return [{"role": "system", "content": "\n\n".join(s for s in sys if s)}] + rest
    return rest


def _payload(provider, model, messages, temperature, max_tokens, json_mode) -> dict:
    if provider == "anthropic":
        sys = "\n\n".join(m["content"] for m in messages if m.get("role") == "system")
        body = [m for m in messages if m.get("role") != "system"]
        p: dict = {"model": model, "messages": body, "max_tokens": max_tokens or 1500,
                   "temperature": temperature}
        if sys:
            p["system"] = sys
        return p
    p = {"model": model, "messages": messages, "temperature": temperature}
    if max_tokens:
        p["max_tokens"] = max_tokens
    # cloud OpenAI-compatible providers honour json_object; skip for self-hosted
    if json_mode and provider in ("openai", "openrouter"):
        p["response_format"] = {"type": "json_object"}
    return p


def _anthropic_endpoint(url: str) -> str:
    base = (url or "").rstrip("/")
    if base.endswith("/messages"):
        return base
    if base.endswith("/v1"):
        return base + "/messages"
    return base + "/v1/messages"


def _parse(provider: str, data: dict) -> str:
    if provider == "anthropic":
        parts = data.get("content") or []
        return "".join(b.get("text", "") for b in parts if isinstance(b, dict))
    msg = data["choices"][0]["message"]
    return msg.get("content") or msg.get("reasoning_content") or ""


# --------------------------------------------------------------------------- #
# calls
# --------------------------------------------------------------------------- #
def call_one(
    url: str,
    model: str,
    api_key: Optional[str],
    messages: list[dict],
    *,
    temperature: float = 0.2,
    max_tokens: int = 1500,
    json_mode: bool = False,
    timeout: float = DEFAULT_TIMEOUT,
    max_retries: int = MAX_RETRIES,
) -> str:
    provider = detect_provider(url)
    msgs = _consolidate_system(messages)
    headers = _headers(provider, api_key)
    payload = _payload(provider, model, msgs, temperature, max_tokens, json_mode)
    target = _anthropic_endpoint(url) if provider == "anthropic" else url

    attempt, last = 0, ""
    while True:
        try:
            r = httpx.post(target, headers=headers, json=payload, timeout=timeout)
            if r.status_code in RETRYABLE_STATUS and attempt < max_retries:
                last = f"HTTP {r.status_code}"
                time.sleep(0.8 * (attempt + 1))
                attempt += 1
                continue
            r.raise_for_status()
            return _parse(provider, r.json())
        except httpx.HTTPError as e:
            last = f"{type(e).__name__}: {e}"
            if attempt < max_retries:
                time.sleep(0.8 * (attempt + 1))
                attempt += 1
                continue
            raise RuntimeError(last) from e


def chat(messages: list[dict], *, candidates: list[tuple], **kw) -> tuple[str, str]:
    """Try each (url, model, api_key) candidate in order; first success wins.
    Returns (text, endpoint_used). Raises if every candidate fails."""
    if not candidates:
        raise RuntimeError("no LLM provider configured")
    errs = []
    for url, model, key in candidates:
        try:
            return call_one(url, model, key, messages, **kw), url
        except Exception as e:  # connection / 5xx / schema → next candidate
            errs.append(f"{model}: {type(e).__name__}")
            continue
    raise RuntimeError("all candidates failed (" + "; ".join(errs) + ")")


# --------------------------------------------------------------------------- #
# tolerant JSON extraction (the fix for markdown-wrapped model output)
# --------------------------------------------------------------------------- #
_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)


def extract_json(text: str) -> Any:
    if not text or not text.strip():
        raise ValueError("empty model response")
    t = text.strip()
    fence = _FENCE.search(t)
    if fence:
        t = fence.group(1).strip()
    try:
        return json.loads(t)
    except Exception:
        pass
    # fall back to the first balanced {...} or [...] block
    starts = [i for i in (t.find("{"), t.find("[")) if i >= 0]
    if starts:
        start = min(starts)
        opener = t[start]
        closer = "}" if opener == "{" else "]"
        depth = 0
        for i in range(start, len(t)):
            if t[i] == opener:
                depth += 1
            elif t[i] == closer:
                depth -= 1
                if depth == 0:
                    return json.loads(t[start:i + 1])
    raise ValueError(f"no JSON object found in response: {t[:160]!r}")


def chat_json(messages: list[dict], *, candidates: list[tuple], **kw) -> tuple[Any, str]:
    kw.setdefault("json_mode", True)
    text, used = chat(messages, candidates=candidates, **kw)
    return extract_json(text), used


# --------------------------------------------------------------------------- #
# provider chain from env — first configured is primary, rest are fallbacks
# --------------------------------------------------------------------------- #
def build_candidates_from_env() -> list[tuple[str, str, Optional[str]]]:
    out: list[tuple[str, str, Optional[str]]] = []

    base = os.getenv("LLM_BASE_URL") or os.getenv("MODEL_BASE_URL")
    base_key = os.getenv("LLM_API_KEY") or os.getenv("MODEL_API_KEY")
    if base:
        out.append((base, os.getenv("MODEL_NAME", "gpt-4o-mini"), base_key))

    ds = os.getenv("DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK") or os.getenv("DeepSeek")
    if ds:
        ds_base = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
        if not ds_base.endswith("/chat/completions"):
            ds_base += "/chat/completions"
        out.append((ds_base, os.getenv("DEEPSEEK_MODEL", "deepseek-chat"), ds))

    oa = os.getenv("OPENAI_API_KEY")
    if oa:
        out.append(("https://api.openai.com/v1/chat/completions",
                    os.getenv("OPENAI_MODEL", "gpt-4o-mini"), oa))

    an = os.getenv("ANTHROPIC_API_KEY")
    if an:
        out.append(("https://api.anthropic.com",
                    os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"), an))

    local = os.getenv("OLLAMA_BASE_URL") or os.getenv("LOCAL_LLM_URL")
    if local:
        local = local.rstrip("/")
        if not local.endswith("/chat/completions"):
            local += "/v1/chat/completions" if not local.endswith("/v1") else "/chat/completions"
        out.append((local, os.getenv("LOCAL_LLM_MODEL", "llama3.1"), None))

    # de-dup by (url, model), first wins (Odysseus _dedupe_candidates behaviour)
    seen, deduped = set(), []
    for c in out:
        k = (c[0], c[1])
        if k not in seen:
            seen.add(k)
            deduped.append(c)
    return deduped
