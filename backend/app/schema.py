"""Form schema: field definitions, conditional logic, and submission validation.

A form is an ordered list of fields. Any field can carry a `show_if` condition, which is
a small tree:

    {"field": "is_student", "op": "equals", "value": "Yes"}          a rule
    {"all": [<condition>, ...]}  /  {"any": [<condition>, ...]}       a group

Conditions may only point at fields *above* them. That one rule makes the dependency
graph acyclic by construction, so visibility is a single top-to-bottom pass.

The browser runs the same evaluation (frontend/src/logic.ts) to toggle fields live; both
implementations are tested against shared/conditions.json.
"""

import re
from datetime import date
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

FieldType = Literal["text", "textarea", "email", "number", "dropdown", "checkbox", "date"]
Op = Literal[
    "equals", "not_equals", "contains", "not_contains", "empty", "not_empty", "gt", "lt"
]

CHOICE_TYPES = {"dropdown", "checkbox"}
TEXT_TYPES = {"text", "textarea", "email"}
# Which operators make sense for which field types
OPS_FOR_TYPE: dict[str, set[str]] = {
    "text": {"equals", "not_equals", "contains", "not_contains", "empty", "not_empty"},
    "textarea": {"contains", "not_contains", "empty", "not_empty"},
    "email": {"equals", "not_equals", "contains", "not_contains", "empty", "not_empty"},
    "number": {"equals", "not_equals", "gt", "lt", "empty", "not_empty"},
    "dropdown": {"equals", "not_equals", "empty", "not_empty"},
    "checkbox": {"contains", "not_contains", "empty", "not_empty"},
    "date": {"equals", "not_equals", "gt", "lt", "empty", "not_empty"},
}
VALUELESS_OPS = {"empty", "not_empty"}
MAX_CONDITION_DEPTH = 5
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
FIELD_ID_RE = r"^[a-z][a-z0-9_]{0,39}$"


class Rule(BaseModel):
    model_config = ConfigDict(extra="forbid")
    field: str
    op: Op
    value: str | float | None = None


class AllGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")
    all: list["Condition"] = Field(min_length=1)


class AnyGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")
    any: list["Condition"] = Field(min_length=1)


Condition = Rule | AllGroup | AnyGroup


class Validation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    min: float | str | None = None  # number, or ISO date for date fields
    max: float | str | None = None
    min_length: int | None = Field(None, ge=0)
    max_length: int | None = Field(None, ge=1)
    pattern: str | None = None


class FieldDef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[str, Field(pattern=FIELD_ID_RE)]
    type: FieldType
    label: str = Field(min_length=1, max_length=300)
    required: bool = False
    placeholder: str = ""
    help: str = ""
    options: list[str] = []
    validation: Validation | None = None
    show_if: Condition | None = None


class FormSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fields: list[FieldDef] = Field(default_factory=list, max_length=200)


# --------------------------------------------------------------------------- evaluation


def _is_empty(v: Any) -> bool:
    return v is None or v == "" or v == []


def _rule_matches(rule: dict, answers: dict[str, Any]) -> bool:
    a = answers.get(rule["field"])
    v = rule.get("value")
    op = rule["op"]
    if op == "empty":
        return _is_empty(a)
    if op == "not_empty":
        return not _is_empty(a)
    if op == "equals":
        return not _is_empty(a) and a == v
    if op == "not_equals":
        return _is_empty(a) or a != v
    if op in ("contains", "not_contains"):
        if isinstance(a, list):
            hit = v in a
        elif isinstance(a, str) and isinstance(v, str):
            hit = v.lower() in a.lower()
        else:
            hit = False
        return hit if op == "contains" else not hit
    if op in ("gt", "lt"):
        # Numbers compare numerically; ISO dates compare correctly as strings
        if _is_empty(a) or v is None or type(a) is bool or isinstance(a, list):
            return False
        try:
            return a > v if op == "gt" else a < v
        except TypeError:
            return False
    raise ValueError(f"unknown op {op!r}")


def evaluate(cond: dict, answers: dict[str, Any]) -> bool:
    """Evaluate a condition tree (as plain dicts) against the visible answers so far."""
    if "all" in cond:
        return all(evaluate(c, answers) for c in cond["all"])
    if "any" in cond:
        return any(evaluate(c, answers) for c in cond["any"])
    return _rule_matches(cond, answers)


def visible_field_ids(fields: list[dict], answers: dict[str, Any]) -> list[str]:
    """Top-to-bottom pass. A hidden field's answer is ignored by every later condition."""
    seen: dict[str, Any] = {}
    visible = []
    for f in fields:
        if f.get("show_if") is None or evaluate(f["show_if"], seen):
            visible.append(f["id"])
            if f["id"] in answers:
                seen[f["id"]] = answers[f["id"]]
    return visible


# --------------------------------------------------------------------------- schema checks


def _check_condition(
    cond: Condition, owner: FieldDef, earlier: dict[str, FieldDef], depth: int, errors: list
) -> None:
    if depth > MAX_CONDITION_DEPTH:
        errors.append((owner.id, f"conditions can nest at most {MAX_CONDITION_DEPTH} levels"))
        return
    if isinstance(cond, AllGroup | AnyGroup):
        for c in cond.all if isinstance(cond, AllGroup) else cond.any:
            _check_condition(c, owner, earlier, depth + 1, errors)
        return

    target = earlier.get(cond.field)
    if target is None:
        errors.append((owner.id, f"condition refers to {cond.field!r}, which isn't a field above"))
        return
    if cond.op not in OPS_FOR_TYPE[target.type]:
        errors.append((owner.id, f"'{cond.op}' can't be used on a {target.type} field"))
        return
    if cond.op in VALUELESS_OPS:
        return
    if target.type == "number":
        if not isinstance(cond.value, int | float):
            errors.append((owner.id, f"condition on {target.id!r} needs a number"))
    elif not isinstance(cond.value, str) or cond.value == "":
        errors.append((owner.id, f"condition on {target.id!r} needs a value"))
    elif target.type in CHOICE_TYPES and cond.value not in target.options:
        errors.append((owner.id, f"{cond.value!r} isn't an option of {target.id!r}"))
    elif target.type == "date" and not _valid_date(cond.value):
        errors.append((owner.id, "date conditions need a YYYY-MM-DD value"))


def _valid_date(s: str) -> bool:
    try:
        date.fromisoformat(s)
        return len(s) == 10
    except ValueError:
        return False


def check_schema(schema: FormSchema) -> list[tuple[str | None, str]]:
    """Semantic checks pydantic can't express. Returns [(field_id, message)]."""
    errors: list[tuple[str | None, str]] = []
    earlier: dict[str, FieldDef] = {}
    for f in schema.fields:
        if f.id in earlier:
            errors.append((f.id, "duplicate field id"))
        if f.type in CHOICE_TYPES:
            if not f.options or any(not o.strip() for o in f.options):
                errors.append((f.id, "needs at least one non-empty option"))
            elif len(set(f.options)) != len(f.options):
                errors.append((f.id, "options must be unique"))
        elif f.options:
            errors.append((f.id, f"{f.type} fields don't take options"))
        v = f.validation
        if v and v.pattern:
            try:
                re.compile(v.pattern)
            except re.error:
                errors.append((f.id, "pattern isn't a valid regular expression"))
        if v and v.min_length is not None and v.max_length is not None:
            if v.min_length > v.max_length:
                errors.append((f.id, "min length is greater than max length"))
        if f.show_if is not None:
            _check_condition(f.show_if, f, earlier, 1, errors)
        earlier[f.id] = f
    return errors


# --------------------------------------------------------------------------- submissions


def _check_value(f: dict, value: Any) -> tuple[Any, str | None]:
    """Coerce and validate one non-empty answer. Returns (clean_value, error)."""
    t = f["type"]
    rules = f.get("validation") or {}

    if t in TEXT_TYPES:
        if not isinstance(value, str):
            return None, "must be text"
        value = value.strip()
        if t == "email" and not EMAIL_RE.match(value):
            return None, "must be a valid email address"
        if rules.get("min_length") is not None and len(value) < rules["min_length"]:
            return None, f"must be at least {rules['min_length']} characters"
        if rules.get("max_length") is not None and len(value) > rules["max_length"]:
            return None, f"must be at most {rules['max_length']} characters"
        if rules.get("pattern") and not re.fullmatch(rules["pattern"], value):
            return None, "doesn't match the required format"
        return value, None

    if t == "number":
        if type(value) is bool or not isinstance(value, int | float):
            return None, "must be a number"
        if rules.get("min") is not None and value < rules["min"]:
            return None, f"must be at least {rules['min']:g}"
        if rules.get("max") is not None and value > rules["max"]:
            return None, f"must be at most {rules['max']:g}"
        return value, None

    if t == "dropdown":
        if value not in f["options"]:
            return None, "pick one of the options"
        return value, None

    if t == "checkbox":
        if not isinstance(value, list) or any(v not in f["options"] for v in value):
            return None, "pick from the options"
        # Keep the form's option order and drop duplicates
        return [o for o in f["options"] if o in value], None

    if t == "date":
        if not isinstance(value, str) or not _valid_date(value):
            return None, "must be a date (YYYY-MM-DD)"
        if rules.get("min") and value < rules["min"]:
            return None, f"must be on or after {rules['min']}"
        if rules.get("max") and value > rules["max"]:
            return None, f"must be on or before {rules['max']}"
        return value, None

    return None, "unknown field type"


def validate_submission(
    fields: list[dict], raw: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, str]]:
    """Returns (clean_answers, errors). Hidden fields are dropped even if the client sent
    them, so a stale answer from a branch the user backed out of is never stored."""
    clean: dict[str, Any] = {}
    errors: dict[str, str] = {}
    for f in fields:
        if f.get("show_if") is not None and not evaluate(f["show_if"], clean):
            continue
        value = raw.get(f["id"])
        if isinstance(value, str) and value.strip() == "":
            value = None
        if _is_empty(value):
            if f.get("required"):
                errors[f["id"]] = "is required"
            continue
        value, err = _check_value(f, value)
        if err:
            errors[f["id"]] = err
        else:
            clean[f["id"]] = value
    return clean, errors
