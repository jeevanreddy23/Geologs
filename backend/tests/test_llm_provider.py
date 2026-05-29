import os
import sys
import unittest
from unittest.mock import patch


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class LlmProviderTests(unittest.TestCase):
    def test_deepseek_config_uses_openai_compatible_endpoint_and_key(self):
        from app.llm_provider import resolve_llm_config

        with patch.dict(
            os.environ,
            {
                "MODEL_PROVIDER": "deepseek",
                "DEEPSEEK_API_KEY": "ds-test-key",
            },
            clear=True,
        ):
            config = resolve_llm_config()

        self.assertEqual(config.provider, "deepseek")
        self.assertEqual(config.model, "deepseek-chat")
        self.assertEqual(config.api_key, "ds-test-key")
        self.assertEqual(config.base_url, "https://api.deepseek.com")

    def test_openai_config_keeps_existing_default_model(self):
        from app.llm_provider import resolve_llm_config

        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}, clear=True):
            config = resolve_llm_config()

        self.assertEqual(config.provider, "openai")
        self.assertEqual(config.model, "gpt-4o")
        self.assertEqual(config.api_key, "sk-test")
        self.assertIsNone(config.base_url)

    def test_deepseek_config_accepts_vite_prefixed_key_when_already_set_in_vercel(self):
        from app.llm_provider import resolve_llm_config

        with patch.dict(
            os.environ,
            {
                "MODEL_PROVIDER": "deepseek",
                "VITE_DEEPSEEK_API_KEY": "vite-ds-test-key",
            },
            clear=True,
        ):
            config = resolve_llm_config()

        self.assertEqual(config.api_key, "vite-ds-test-key")


if __name__ == "__main__":
    unittest.main()
