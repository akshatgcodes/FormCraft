"""The same cases run in frontend/src/logic.test.ts, so client and server can't drift."""

import json
from pathlib import Path

import pytest

from app.schema import evaluate, visible_field_ids

CASES = json.loads((Path(__file__).parents[2] / "shared" / "conditions.json").read_text())


@pytest.mark.parametrize("case", CASES["rules"], ids=lambda c: c["name"])
def test_rule(case):
    assert evaluate(case["cond"], case["answers"]) is case["expected"]


@pytest.mark.parametrize("case", CASES["visibility"], ids=lambda c: c["name"])
def test_visibility(case):
    assert visible_field_ids(case["fields"], case["answers"]) == case["expected"]
