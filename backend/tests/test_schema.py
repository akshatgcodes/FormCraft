import pytest
from pydantic import ValidationError

from app.schema import FormSchema, check_schema, validate_submission


def schema(*fields):
    return FormSchema.model_validate({"fields": list(fields)})


def errors_for(*fields):
    return [msg for _, msg in check_schema(schema(*fields))]


STUDENT = {"id": "is_student", "type": "dropdown", "label": "Student?", "options": ["Yes", "No"]}


def test_valid_schema_has_no_errors():
    college = {
        "id": "college",
        "type": "text",
        "label": "College",
        "show_if": {"field": "is_student", "op": "equals", "value": "Yes"},
    }
    assert errors_for(STUDENT, college) == []


def test_condition_cannot_point_forward():
    early = {
        "id": "college",
        "type": "text",
        "label": "College",
        "show_if": {"field": "is_student", "op": "equals", "value": "Yes"},
    }
    assert "isn't a field above" in errors_for(early, STUDENT)[0]


def test_self_reference_rejected():
    f = {"id": "a", "type": "text", "label": "A", "show_if": {"field": "a", "op": "empty"}}
    assert "isn't a field above" in errors_for(f)[0]


def test_op_must_fit_field_type():
    f = {
        "id": "x",
        "type": "text",
        "label": "X",
        "show_if": {"field": "is_student", "op": "gt", "value": "Yes"},
    }
    assert "can't be used on a dropdown" in errors_for(STUDENT, f)[0]


def test_condition_value_must_be_an_option():
    f = {
        "id": "x",
        "type": "text",
        "label": "X",
        "show_if": {"field": "is_student", "op": "equals", "value": "Maybe"},
    }
    assert "isn't an option" in errors_for(STUDENT, f)[0]


def test_number_condition_needs_number():
    age = {"id": "age", "type": "number", "label": "Age"}
    f = {
        "id": "x",
        "type": "text",
        "label": "X",
        "show_if": {"field": "age", "op": "gt", "value": "18"},
    }
    assert "needs a number" in errors_for(age, f)[0]


def test_duplicate_ids_and_bad_options():
    msgs = errors_for(
        {"id": "a", "type": "text", "label": "A"},
        {"id": "a", "type": "dropdown", "label": "B", "options": ["x", "x"]},
    )
    assert "duplicate field id" in msgs and "options must be unique" in msgs


def test_bad_regex_rejected():
    f = {"id": "a", "type": "text", "label": "A", "validation": {"pattern": "("}}
    assert "valid regular expression" in errors_for(f)[0]


def test_condition_depth_limit():
    cond = {"field": "is_student", "op": "equals", "value": "Yes"}
    for _ in range(6):
        cond = {"all": [cond]}
    f = {"id": "x", "type": "text", "label": "X", "show_if": cond}
    assert "nest at most" in errors_for(STUDENT, f)[0]


def test_structural_errors_from_pydantic():
    with pytest.raises(ValidationError):
        schema({"id": "Bad Id", "type": "text", "label": "A"})
    with pytest.raises(ValidationError):
        schema({"id": "a", "type": "slider", "label": "A"})


# --------------------------------------------------------------------------- submissions

FIELDS = [
    {
        "id": "name",
        "type": "text",
        "label": "Name",
        "required": True,
        "validation": {"min_length": 2},
    },
    {"id": "email", "type": "email", "label": "Email"},
    {"id": "age", "type": "number", "label": "Age", "validation": {"min": 13, "max": 120}},
    STUDENT,
    {
        "id": "college",
        "type": "text",
        "label": "College",
        "required": True,
        "show_if": {"field": "is_student", "op": "equals", "value": "Yes"},
    },
    {"id": "langs", "type": "checkbox", "label": "Languages", "options": ["Go", "Python", "Rust"]},
    {"id": "start", "type": "date", "label": "Start", "validation": {"min": "2024-01-01"}},
    {"id": "roll", "type": "text", "label": "Roll no.", "validation": {"pattern": r"RA\d{4}"}},
]


def test_clean_submission():
    clean, errors = validate_submission(
        FIELDS,
        {
            "name": "  Akshat ",
            "age": 21,
            "is_student": "Yes",
            "college": "SRMIST",
            "langs": ["Rust", "Go", "Go"],
            "start": "2024-06-01",
            "roll": "RA1234",
        },
    )
    assert errors == {}
    assert clean["name"] == "Akshat"
    assert clean["langs"] == ["Go", "Rust"]  # option order, deduped


def test_required_field_inside_visible_branch():
    _, errors = validate_submission(FIELDS, {"name": "Ak", "is_student": "Yes"})
    assert errors == {"college": "is required"}


def test_hidden_required_field_is_skipped_and_dropped():
    clean, errors = validate_submission(
        FIELDS, {"name": "Ak", "is_student": "No", "college": "Stale"}
    )
    assert errors == {} and "college" not in clean


@pytest.mark.parametrize(
    "answers,field,msg",
    [
        ({"name": "A"}, "name", "at least 2 characters"),
        ({"name": "   "}, "name", "is required"),
        ({"name": "Ak", "email": "nope"}, "email", "valid email"),
        ({"name": "Ak", "age": 5}, "age", "at least 13"),
        ({"name": "Ak", "age": "21"}, "age", "must be a number"),
        ({"name": "Ak", "age": True}, "age", "must be a number"),
        ({"name": "Ak", "is_student": "Maybe"}, "is_student", "pick one"),
        ({"name": "Ak", "langs": ["Java"]}, "langs", "pick from"),
        ({"name": "Ak", "start": "2023-12-31"}, "start", "on or after"),
        ({"name": "Ak", "start": "31/12/2024"}, "start", "YYYY-MM-DD"),
        ({"name": "Ak", "roll": "RA12"}, "roll", "required format"),
    ],
)
def test_invalid_values(answers, field, msg):
    _, errors = validate_submission(FIELDS, answers)
    assert msg in errors[field]


def test_unknown_keys_ignored():
    clean, errors = validate_submission(FIELDS, {"name": "Ak", "hacker": "x"})
    assert errors == {} and "hacker" not in clean
