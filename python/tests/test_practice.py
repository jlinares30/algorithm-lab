"""Pruebas de «completa el código».

Usan los archivos reales de los algoritmos como entrada y como respuesta
correcta; aquí no se implementa ninguna búsqueda.
"""

from pathlib import Path

import pytest

from challenges.practice import blank_candidates, build_exercise, check_exercise, step_records

SEARCHING = Path(__file__).resolve().parents[1] / "algorithms" / "searching"
ALGORITHMS = [("binary_search", True), ("linear_search", False)]


def source_of(name):
    return (SEARCHING / f"{name}.py").read_text(encoding="utf-8").replace("\r\n", "\n")


def check(name, sorted_input, answers):
    return check_exercise(source_of(name), {"algorithm": name, "answers": answers, "sorted": sorted_input, "seed": 7})


@pytest.mark.parametrize("name", [name for name, _ in ALGORITHMS])
def test_hidden_lines_are_logic_never_step_records(name):
    lines = source_of(name).split("\n")
    candidates = blank_candidates(source_of(name), name)

    assert len(candidates) >= 3
    for number in candidates:
        text = lines[number - 1].strip()
        assert text
        assert not text.startswith(("def ", "steps.append", "steps =", '"'))
        assert "steps is None" not in text


@pytest.mark.parametrize("name", [name for name, _ in ALGORITHMS])
def test_exercise_covers_the_function_and_hides_the_requested_lines(name):
    lines = source_of(name).split("\n")
    exercise = build_exercise(source_of(name), {"algorithm": name, "seed": 1, "count": 2})["lines"]

    assert exercise[0]["text"].startswith(f"def {name}(")
    assert [line["number"] for line in exercise] == list(range(exercise[0]["number"], exercise[-1]["number"] + 1))
    assert sum(line["blank"] for line in exercise) == 2
    for line in exercise:
        assert " " * line["indent"] + line["text"] == lines[line["number"] - 1].rstrip()
        if line["blank"]:
            assert line["number"] in blank_candidates(source_of(name), name)


@pytest.mark.parametrize("name", [name for name, _ in ALGORITHMS])
def test_step_records_cover_whole_statements_and_never_a_hidden_line(name):
    lines = source_of(name).split("\n")
    records = step_records(source_of(name), name)
    exercise = build_exercise(source_of(name), {"algorithm": name, "seed": 3, "count": 2})

    assert exercise["records"] == records
    assert len(records) >= 3
    for record in records:
        assert lines[record["start"] - 1].strip().startswith("steps.")
        assert lines[record["end"] - 1].strip().endswith(")")
        assert record["action"] and f'"{record["action"]}"' in "".join(lines[record["start"] - 1 : record["end"]])
        assert not set(range(record["start"], record["end"] + 1)) & set(blank_candidates(source_of(name), name))
    assert len({record["action"] for record in records}) == len(records)


def test_step_record_without_a_plain_action_has_no_label():
    source = "def ejemplo(numbers, target):\n    steps = []\n    steps.append(target)\n    steps.append({'action': target})\n    return -1, steps\n"

    assert step_records(source, "ejemplo") == [
        {"start": 3, "end": 3, "action": None},
        {"start": 4, "end": 4, "action": None},
    ]


def test_exercises_vary_with_the_seed_and_cap_the_count():
    source = source_of("binary_search")
    hidden = {
        tuple(line["number"] for line in build_exercise(source, {"algorithm": "binary_search", "seed": seed, "count": 2})["lines"] if line["blank"])
        for seed in range(20)
    }
    everything = build_exercise(source_of("linear_search"), {"algorithm": "linear_search", "seed": 0, "count": 99})

    assert len(hidden) >= 5
    assert sum(line["blank"] for line in everything["lines"]) == len(blank_candidates(source_of("linear_search"), "linear_search"))


@pytest.mark.parametrize(("name", "sorted_input"), ALGORITHMS)
def test_original_lines_are_accepted(name, sorted_input):
    lines = source_of(name).split("\n")
    answers = {str(number): lines[number - 1].strip() for number in blank_candidates(source_of(name), name)}

    assert check(name, sorted_input, answers)["status"] == "passed"


@pytest.mark.parametrize(("name", "sorted_input"), ALGORITHMS)
def test_answer_is_reindented_and_may_differ_in_spacing(name, sorted_input):
    lines = source_of(name).split("\n")
    number = blank_candidates(source_of(name), name)[-1]

    assert check(name, sorted_input, {str(number): "      " + lines[number - 1].strip() + "   "})["status"] == "passed"


@pytest.mark.parametrize(("name", "sorted_input"), ALGORITHMS)
def test_wrong_line_reports_a_failing_case_with_both_runs(name, sorted_input):
    number = blank_candidates(source_of(name), name)[-1]
    result = check(name, sorted_input, {str(number): "return 0, steps"})

    assert result["status"] == "wrong"
    assert 0 < result["failed"] <= result["total"]
    case = result["case"]
    assert set(case) == {"numbers", "target", "expected", "actual"}
    assert (case["actual"]["index"], case["actual"]["steps"]) != (case["expected"]["index"], case["expected"]["steps"])


def test_invalid_python_is_reported_with_its_line():
    number = blank_candidates(source_of("linear_search"), "linear_search")[0]
    result = check("linear_search", False, {str(number): "for index in ("})

    assert result["status"] == "syntax"
    assert f"Línea {number}" in result["message"]


def test_line_that_never_ends_or_crashes_counts_as_wrong():
    number = blank_candidates(source_of("linear_search"), "linear_search")[1]

    assert check("linear_search", False, {str(number): "while True:"})["status"] == "wrong"
    assert check("linear_search", False, {str(number): "if desconocido == value:"})["case"]["actual"]["status"] == "crashed"
