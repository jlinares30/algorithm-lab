"""Pruebas del generador de retos «encuentra el error».

Usan los archivos reales de los algoritmos como entrada; aquí no se implementa
ninguna búsqueda.
"""

from pathlib import Path

import pytest

from challenges.faults import MAX_STEPS, build_challenge, load, mutations, run

SEARCHING = Path(__file__).resolve().parents[1] / "algorithms" / "searching"
ALGORITHMS = [("binary_search", True), ("linear_search", False)]


def source_of(name):
    return (SEARCHING / f"{name}.py").read_text(encoding="utf-8")


def request_for(name, sorted_input, seed, **extra):
    numbers = [3, 8, 12, 20, 27, 31, 40] if sorted_input else [27, 3, 40, 12, 31, 8, 20]
    return {
        "algorithm": name,
        "numbers": numbers,
        "targets": numbers + [0, 13, 99],
        "sorted": sorted_input,
        "seed": seed,
        **extra,
    }


@pytest.mark.parametrize("name", [name for name, _ in ALGORITHMS])
def test_every_mutation_changes_exactly_one_line(name):
    source = source_of(name).replace("\r\n", "\n")
    original = source.split("\n")
    found = mutations(source, name)

    assert found
    for mutation in found:
        changed = mutation["source"].split("\n")
        assert len(changed) == len(original)
        different = [index for index, line in enumerate(changed) if line != original[index]]
        assert different == [mutation["line"] - 1]
        assert mutation["original"] == original[mutation["line"] - 1].strip()
        assert mutation["mutated"] != mutation["original"]
        compile(mutation["source"], f"{name}.py", "exec")


@pytest.mark.parametrize("name", [name for name, _ in ALGORITHMS])
def test_recorded_steps_are_never_edited(name):
    for mutation in mutations(source_of(name), name):
        assert '"action"' not in mutation["original"]


@pytest.mark.parametrize(("name", "sorted_input"), ALGORITHMS)
def test_challenge_reports_the_correct_run_unchanged(name, sorted_input):
    correct = load(source_of(name), name)
    for seed in range(15):
        request = request_for(name, sorted_input, seed)
        challenge = build_challenge(source_of(name), request)
        index, steps = correct(list(request["numbers"]), challenge["target"])

        assert challenge["target"] in request["targets"]
        assert challenge["expected"] == {"index": index, "steps": steps}
        assert challenge["actual"]["status"] in ("finished", "crashed", "endless")


@pytest.mark.parametrize(("name", "sorted_input"), ALGORITHMS)
def test_chosen_fault_is_never_equivalent_to_the_original(name, sorted_input):
    correct = load(source_of(name), name)
    for seed in range(15):
        mutation = build_challenge(source_of(name), request_for(name, sorted_input, seed))["mutation"]
        faulty = load(mutation["source"], name)
        numbers = request_for(name, sorted_input, seed)["numbers"]
        probes = [(numbers[:size], target) for size in range(len(numbers) + 1) for target in numbers + [0, 13, 99]]

        assert any(
            run(faulty, n, t) != {"status": "finished", "index": correct(list(n), t)[0], "steps": correct(list(n), t)[1], "message": None}
            for n, t in probes
        )


def test_challenges_vary_with_the_seed():
    source = source_of("binary_search")
    seen = {
        (challenge["mutation"]["line"], challenge["mutation"]["mutated"])
        for challenge in (build_challenge(source, request_for("binary_search", True, seed)) for seed in range(40))
    }

    assert len(seen) >= 5


def test_same_fault_can_be_replayed_on_other_data():
    source = source_of("binary_search")
    first = build_challenge(source, request_for("binary_search", True, 1))
    again = build_challenge(source, request_for("binary_search", True, 2, mutation=first["mutation"]))

    assert again["mutation"] == first["mutation"]


def test_endless_run_is_stopped_and_keeps_its_steps():
    def never_ends(numbers, target):
        steps = []
        while True:
            steps.append({"action": "check", "index": 0})

    outcome = run(never_ends, [1, 2, 3], 2)

    assert outcome["status"] == "endless"
    assert 0 < len(outcome["steps"]) <= 300


def test_crash_is_reported_with_the_steps_recorded_so_far():
    def crashes(numbers, target):
        steps = [{"action": "check", "index": 0}]
        return numbers[len(numbers)], steps

    outcome = run(crashes, [1, 2, 3], 2)

    assert outcome["status"] == "crashed"
    assert outcome["message"].startswith("IndexError")
    assert outcome["steps"] == [{"action": "check", "index": 0}]


def test_recursion_without_end_counts_as_endless_and_keeps_its_steps():
    # Not an algorithm: a function that only calls itself again.
    def again(numbers, target, steps=None):
        steps = [] if steps is None else steps
        steps.append({"action": "again"})
        return again(numbers, target, steps)

    outcome = run(again, [1, 2, 3], 2)

    assert outcome["status"] == "endless"
    assert outcome["steps"] == [{"action": "again"}] * MAX_STEPS


@pytest.mark.parametrize(("name", "sorted_input"), ALGORITHMS)
def test_most_challenges_have_several_steps_to_choose_from(name, sorted_input):
    runs = [build_challenge(source_of(name), request_for(name, sorted_input, seed))["actual"] for seed in range(60)]
    single = sum(len(actual["steps"]) < 2 for actual in runs)

    assert single <= 60 * 0.3
