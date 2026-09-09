"""Semantic dialogue classification: interface, Gemini impl, and test fake.

The Stream Analyst Agent depends only on the ``DialogueClassifier``
interface, so production code always talks to Gemini while unit/integration
tests use ``FakeDialogueClassifier`` and never make live model calls.
"""

from __future__ import annotations

import json
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from agents.prompts import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger("echo.classifier")

ALLOWED_STATUSES = {"MATCH", "ACCEPTABLE_ADLIB", "DRIFT"}
DEFAULT_MODEL = "gemini-2.0-flash"


class ClassifierError(Exception):
    """Raised for classifier-layer failures, with a stable error category."""

    def __init__(self, category: str, detail: str):
        self.category = category
        self.detail = detail
        super().__init__(f"{category}: {detail}")


@dataclass(frozen=True)
class ClassificationResult:
    status: str
    confidence: float
    diverging_phrase: Optional[str] = None
    conflicts_with_take: Optional[int] = None
    reason: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "confidence": self.confidence,
            "diverging_phrase": self.diverging_phrase,
            "conflicts_with_take": self.conflicts_with_take,
            "reason": self.reason,
        }


def parse_and_validate(raw_text: str) -> ClassificationResult:
    """Parse a raw model response into a validated ``ClassificationResult``.

    Never trusts model output blindly: enforces allowed statuses, confidence
    range, and required-null-field rules for MATCH.

    Raises:
        ClassifierError: category ``GEMINI_INVALID_OUTPUT`` on any violation.
    """
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ClassifierError("GEMINI_INVALID_OUTPUT", f"not valid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise ClassifierError("GEMINI_INVALID_OUTPUT", "response is not a JSON object")

    status = data.get("status")
    if status not in ALLOWED_STATUSES:
        raise ClassifierError("GEMINI_INVALID_OUTPUT", f"illegal status: {status!r}")

    confidence = data.get("confidence")
    if not isinstance(confidence, (int, float)) or isinstance(confidence, bool):
        raise ClassifierError("GEMINI_INVALID_OUTPUT", f"confidence not numeric: {confidence!r}")
    confidence = float(confidence)
    if not (0.0 <= confidence <= 1.0):
        raise ClassifierError("GEMINI_INVALID_OUTPUT", f"confidence out of range: {confidence}")

    diverging_phrase = data.get("diverging_phrase")
    conflicts_with_take = data.get("conflicts_with_take")
    reason = data.get("reason")

    if status == "MATCH" and (diverging_phrase or conflicts_with_take or reason):
        # Don't hard-fail a MATCH just for a chatty model; normalize instead.
        logger.warning("MATCH returned with non-null drift fields; normalizing to null")
        diverging_phrase, conflicts_with_take, reason = None, None, None

    if conflicts_with_take is not None:
        if isinstance(conflicts_with_take, bool) or not isinstance(conflicts_with_take, int):
            raise ClassifierError(
                "GEMINI_INVALID_OUTPUT",
                f"conflicts_with_take must be an integer or null: {conflicts_with_take!r}",
            )

    return ClassificationResult(
        status=status,
        confidence=confidence,
        diverging_phrase=str(diverging_phrase) if diverging_phrase else None,
        conflicts_with_take=conflicts_with_take,
        reason=str(reason) if reason else None,
    )


class DialogueClassifier(ABC):
    """Interface for turning (reference, prior takes, new take) into a classification."""

    @abstractmethod
    def classify(
        self,
        reference_line: str,
        prior_takes: list[dict],
        new_take: dict,
    ) -> ClassificationResult:
        """Classify a new take. Raises ``ClassifierError`` on failure."""
        raise NotImplementedError


class GeminiDialogueClassifier(DialogueClassifier):
    """Production classifier backed by Gemini via the google-genai SDK.

    Retries once on timeout or invalid output before surfacing a
    ``ClassifierError`` for the caller to route to NEEDS_REVIEW.
    """

    def __init__(
        self,
        model: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 15.0,
        max_attempts: int = 2,
    ):
        self._model = model or os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
        self._api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self._timeout_seconds = timeout_seconds
        self._max_attempts = max_attempts
        self._client = None  # lazy init so tests never require the SDK/creds

    def _get_client(self):
        if self._client is None:
            if not self._api_key:
                raise ClassifierError("GEMINI_ERROR", "GEMINI_API_KEY is not configured")
            from google import genai  # imported lazily; heavy + network-adjacent

            self._client = genai.Client(api_key=self._api_key)
        return self._client

    def classify(
        self,
        reference_line: str,
        prior_takes: list[dict],
        new_take: dict,
    ) -> ClassificationResult:
        user_prompt = build_user_prompt(reference_line, prior_takes, new_take)
        last_error: ClassifierError | None = None

        for attempt in range(1, self._max_attempts + 1):
            try:
                raw_text = self._call_gemini(user_prompt)
                return parse_and_validate(raw_text)
            except TimeoutError as exc:
                last_error = ClassifierError("GEMINI_TIMEOUT", str(exc))
                logger.warning("Gemini timeout on attempt %s/%s", attempt, self._max_attempts)
            except ClassifierError as exc:
                last_error = exc
                logger.warning(
                    "Gemini invalid output on attempt %s/%s: %s",
                    attempt, self._max_attempts, exc.detail,
                )
            except Exception as exc:  # pragma: no cover - network/SDK failures
                last_error = ClassifierError("GEMINI_ERROR", str(exc))
                logger.warning("Gemini error on attempt %s/%s: %s", attempt, self._max_attempts, exc)

        assert last_error is not None
        raise last_error

    def _call_gemini(self, user_prompt: str) -> str:
        client = self._get_client()
        start = time.monotonic()
        try:
            response = client.models.generate_content(
                model=self._model,
                contents=user_prompt,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "response_mime_type": "application/json",
                    "temperature": 0.0,
                },
            )
        except Exception as exc:
            elapsed = time.monotonic() - start
            if elapsed >= self._timeout_seconds:
                raise TimeoutError(str(exc)) from exc
            raise
        return response.text


class FakeDialogueClassifier(DialogueClassifier):
    """Deterministic classifier for unit/integration tests.

    Simulates real semantic judgment on the fixed demo script (exact match /
    contraction ad-lib / added-emphasis drift) via lightweight heuristics, so
    tests never depend on a live Gemini call. Can also be configured to raise
    a specific ``ClassifierError`` to exercise failure-handling paths.
    """

    def __init__(self, raise_error: ClassifierError | None = None, fixed_result: ClassificationResult | None = None):
        self._raise_error = raise_error
        self._fixed_result = fixed_result
        self.calls: list[tuple[str, list[dict], dict]] = []

    _CONTRACTION_EXPANSIONS = {
        "didn't": "did not",
        "wasn't": "was not",
        "isn't": "is not",
        "couldn't": "could not",
        "wouldn't": "would not",
        "shouldn't": "should not",
        "don't": "do not",
        "doesn't": "does not",
    }

    # Emphasis/intensifier words: adding one of these is a continuity-risk
    # signal in the demo heuristic, mirroring what Gemini would flag as DRIFT.
    _INTENSIFIERS = {
        "really", "very", "truly", "actually", "literally", "definitely",
        "totally", "absolutely", "completely", "just", "still",
    }

    # Negation words that are semantically equivalent for this heuristic
    # (e.g. "never trusted" ~ "did not trust") -- collapsed to one token so
    # a negation paraphrase isn't mistaken for added content.
    _NEGATIONS = {"never", "not", "no"}

    # Grammatical filler that carries no continuity-relevant meaning on its
    # own (e.g. the auxiliary "did" introduced by expanding a contraction).
    _STOPWORDS = {"did", "do", "does", "i", "him", "her", "it", "the", "a", "an", "to", "that"}

    @classmethod
    def _stem(cls, word: str) -> str:
        for suffix in ("ing", "ed", "s"):
            if word.endswith(suffix) and len(word) > len(suffix) + 2:
                return word[: -len(suffix)]
        return word

    @classmethod
    def _normalized_stems(cls, line: str) -> set[str]:
        text = line.strip().lower().rstrip(".")
        for contraction, expansion in cls._CONTRACTION_EXPANSIONS.items():
            text = text.replace(contraction, expansion)
        stems = set()
        for word in text.split():
            if word in cls._NEGATIONS:
                stems.add("neg")
            else:
                stems.add(cls._stem(word))
        return stems

    def classify(
        self,
        reference_line: str,
        prior_takes: list[dict],
        new_take: dict,
    ) -> ClassificationResult:
        self.calls.append((reference_line, prior_takes, new_take))

        if self._raise_error is not None:
            raise self._raise_error
        if self._fixed_result is not None:
            return self._fixed_result

        new_line = new_take["line"].strip().lower().rstrip(".")
        ref_line = reference_line.strip().lower().rstrip(".")
        conflict_take = prior_takes[0]["take_number"] if prior_takes else None

        if new_line == ref_line:
            return ClassificationResult(status="MATCH", confidence=0.98)

        ref_stems = self._normalized_stems(reference_line)
        new_stems = self._normalized_stems(new_take["line"])
        added_stems = (new_stems - ref_stems) - self._STOPWORDS

        intensifiers_added = added_stems & self._INTENSIFIERS
        if intensifiers_added:
            diverging = " ".join(sorted(intensifiers_added))
            return ClassificationResult(
                status="DRIFT",
                confidence=0.91,
                diverging_phrase=diverging,
                conflicts_with_take=conflict_take,
                reason=(
                    f"Adds \"{diverging}\", changing emphasis in a way that may prevent "
                    "clean intercutting with the prior take."
                ),
            )

        if not added_stems:
            # Pure contraction/omission (e.g. "I never trusted" -> "I didn't trust")
            return ClassificationResult(
                status="ACCEPTABLE_ADLIB",
                confidence=0.86,
                diverging_phrase=new_take["line"],
                conflicts_with_take=conflict_take,
                reason="Wording changed but meaning and rhythm remain close enough to intercut.",
            )

        diverging = " ".join(sorted(added_stems))
        return ClassificationResult(
            status="DRIFT",
            confidence=0.91,
            diverging_phrase=diverging,
            conflicts_with_take=conflict_take,
            reason=(
                f"Adds \"{diverging}\", introducing new content not present in the "
                "prior take, creating continuity risk."
            ),
        )
