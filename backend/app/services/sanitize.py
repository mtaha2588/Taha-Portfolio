"""Input clean-up and spam heuristics shared by the API."""

import re
import unicodedata

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_URL = re.compile(r"(https?://|www\.)", re.IGNORECASE)
# Any HTML-like tag (<b>, </div>, <script ...>). Plain "<3" or "a < b" are still allowed.
_HTML_TAG = re.compile(r"</?[a-zA-Z][a-zA-Z0-9-]*(\s[^<>]*)?/?\s*>")

MAX_LINKS = 3
MIN_FILL_MS = 2500  # a human cannot fill in the contact form faster than this


def clean_text(value: str, *, multiline: bool = False) -> str:
    """Normalise unicode, drop control characters and tidy whitespace."""
    value = unicodedata.normalize("NFKC", value)
    value = _CONTROL_CHARS.sub("", value)
    if multiline:
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in value.replace("\r\n", "\n").split("\n")]
        value = re.sub(r"\n{3,}", "\n\n", "\n".join(lines))
    else:
        value = re.sub(r"\s+", " ", value)
    return value.strip()


def count_links(value: str) -> int:
    return len(_URL.findall(value))


def contains_markup(value: str) -> bool:
    return bool(_HTML_TAG.search(value))


def spam_reason(*, honeypot: str | None, elapsed_ms: int | None) -> str | None:
    """Returns why a submission looks automated, or None if it looks human."""
    if honeypot:
        return "honeypot"
    if elapsed_ms is not None and elapsed_ms < MIN_FILL_MS:
        return "too_fast"
    return None
