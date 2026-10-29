from algorithms.searching.binary_search import binary_search, steps
import pytest

def test_empty_list():
    result, steps = binary_search([], 10)

    assert result == -1
    assert len(steps) == 1
    assert steps[0]["action"] == "not_found"

def test_existing_element():
    numbers = [2, 5, 9, 14, 20, 27, 35, 44, 56, 69, 83]

    result, steps = binary_search(numbers, 69)

    assert result == 9
    assert len(steps) == 3
    assert steps[-1]["action"] == "found"

def test_non_existing_element():
    numbers = [2, 5, 9, 14, 20, 27, 35, 44, 56, 69, 83]

    result, steps = binary_search(numbers, 100)

    assert result == -1
    assert steps[-1]["action"] == "not_found"

@pytest.mark.parametrize("target, expected", [
    (10, 0),
    (50, 4),
])
def test_boundary_elements(target, expected):
    numbers = [10, 20, 30, 40, 50]

    result, steps = binary_search(numbers, target)

    assert result == expected
    assert steps[-1]["action"] == "found"