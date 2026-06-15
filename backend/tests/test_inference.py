"""Tests for the robust multi-provider inference layer (app.inference)."""
import os
import httpx
import pytest

import app.inference as inf


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    monkeypatch.setattr(inf.time, "sleep", lambda *a, **k: None)


def test_extract_json_variants():
    assert inf.extract_json('{"a": 1}') == {"a": 1}
    assert inf.extract_json('```json\n{"x": [1, 2]}\n```') == {"x": [1, 2]}
    assert inf.extract_json('Here you go:\n{"lithology_units": [{"from": 0}]} \nthanks') == {"lithology_units": [{"from": 0}]}
    assert inf.extract_json('[{"k": 1}]') == [{"k": 1}]
    with pytest.raises(ValueError):
        inf.extract_json("no json here")


def test_candidate_chain_order(monkeypatch):
    for k in list(os.environ):
        if "DEEPSEEK" in k or "AI_GATEWAY" in k or k in ("OPENAI_API_KEY", "LLM_BASE_URL", "MODEL_BASE_URL", "OLLAMA_BASE_URL", "AUTOSOIL_API_KEY"):
            monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "ds")
    monkeypatch.setenv("OPENAI_API_KEY", "oa")
    c = inf.build_candidates_from_env()
    assert c[0][0] == "https://api.deepseek.com/chat/completions" and c[0][2] == "ds"
    assert c[1][0] == "https://api.openai.com/v1/chat/completions" and c[1][2] == "oa"


def test_candidate_chain_uses_vercel_deepseek_proxy(monkeypatch):
    for k in list(os.environ):
        if "DEEPSEEK" in k or "AI_GATEWAY" in k or k in ("OPENAI_API_KEY", "LLM_BASE_URL", "MODEL_BASE_URL", "OLLAMA_BASE_URL", "AUTOSOIL_API_KEY"):
            monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("DEEPSEEK_PROXY_URL", "https://auto-soil-logger.vercel.app/api/deepseek/chat")
    monkeypatch.setenv("AUTOSOIL_API_KEY", "proxy-test-key")

    c = inf.build_candidates_from_env()

    assert c[0][0] == "https://auto-soil-logger.vercel.app/api/deepseek/chat"
    assert c[0][1] == "deepseek-chat"
    assert c[0][2] is None
    assert c[0][3]["X-Autosoil-Api-Key"] == "proxy-test-key"


def test_proxy_candidate_sends_extra_headers(monkeypatch):
    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        return _FakeResp(200, '{"ok": true}')

    monkeypatch.setattr(inf.httpx, "post", fake_post)

    parsed, used = inf.chat_json(
        [{"role": "user", "content": "hi"}],
        candidates=[(
            "https://auto-soil-logger.vercel.app/api/deepseek/chat",
            "deepseek-chat",
            None,
            {"X-Autosoil-Api-Key": "proxy-test-key"},
        )],
    )

    assert used == "https://auto-soil-logger.vercel.app/api/deepseek/chat"
    assert parsed == {"ok": True}
    assert captured["headers"]["X-Autosoil-Api-Key"] == "proxy-test-key"


class _FakeResp:
    def __init__(self, status, text=""):
        self.status_code = status
        self._t = text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("err", request=None, response=None)

    def json(self):
        return {"choices": [{"message": {"content": self._t}}]}


def test_provider_fallback(monkeypatch):
    candidates = [
        ("https://api.deepseek.com/chat/completions", "deepseek-chat", "k1"),
        ("https://api.openai.com/v1/chat/completions", "gpt-4o-mini", "k2"),
    ]

    def fake_post(url, headers=None, json=None, timeout=None):
        if "deepseek" in url:
            raise httpx.ConnectError("down")
        return _FakeResp(200, '```json\n{"lithology_units": [{"from": 0, "to": 2, "material": "SANDSTONE"}]}\n```')

    monkeypatch.setattr(inf.httpx, "post", fake_post)
    parsed, used = inf.chat_json([{"role": "user", "content": "hi"}], candidates=candidates)
    assert used == "https://api.openai.com/v1/chat/completions"
    assert parsed["lithology_units"][0]["material"] == "SANDSTONE"


def test_retry_on_transient_status(monkeypatch):
    seq = [503, 200]

    def fake_post(url, headers=None, json=None, timeout=None):
        return _FakeResp(seq.pop(0), '{"ok": true}')

    monkeypatch.setattr(inf.httpx, "post", fake_post)
    out = inf.call_one("https://api.deepseek.com/chat/completions", "m", "k", [{"role": "user", "content": "x"}])
    assert '"ok"' in out and seq == []


def test_all_candidates_fail_raises(monkeypatch):
    def fake_post(url, headers=None, json=None, timeout=None):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(inf.httpx, "post", fake_post)
    with pytest.raises(RuntimeError):
        inf.chat([{"role": "user", "content": "x"}],
                 candidates=[("https://api.deepseek.com/chat/completions", "m", "k")])
