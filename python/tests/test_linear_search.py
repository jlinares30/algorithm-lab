"""Contrato que la interfaz espera de linear_search: (índice, steps).

Cada paso es un dict con "action", "index" y "current" (el valor revisado):
  {"action": "check", "index": i, "current": numbers[i]}      no coincide
  {"action": "found", "index": i, "current": numbers[i]}      último paso
  {"action": "not_found", "index": None, "current": None}     último paso
"""

from algorithms.searching.linear_search import linear_search


def test_empty_list():
    result, steps = linear_search([], 10)

    assert result == -1
    assert steps == [{"action": "not_found", "current": None, "index": None}]


def test_existing_element_in_unsorted_list():
    numbers = [42, 7, 19, 3]

    result, steps = linear_search(numbers, 19)

    assert result == 2
    assert [step["action"] for step in steps] == ["check", "check", "found"]
    assert [step["index"] for step in steps] == [0, 1, 2]
    assert [step["current"] for step in steps] == [42, 7, 19]


def test_non_existing_element():
    numbers = [42, 7, 19, 3]

    result, steps = linear_search(numbers, 100)

    assert result == -1
    assert len(steps) == len(numbers) + 1
    assert [step["index"] for step in steps[:-1]] == [0, 1, 2, 3]
    assert steps[-1] == {"action": "not_found", "current": None, "index": None}


def test_returns_first_match():
    result, steps = linear_search([5, 8, 5], 5)

    assert result == 0
    assert steps == [{"action": "found", "current": 5, "index": 0}]


def test_calls_do_not_share_steps():
    linear_search([1, 2, 3], 3)
    _, steps = linear_search([1, 2, 3], 1)

    assert len(steps) == 1
