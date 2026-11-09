"""Contrato que la interfaz espera de linear_search: (índice, steps).

Cada paso es un dict con "index" y "action":
  {"index": i, "action": "compare"}       numbers[i] se comparó y no coincide
  {"index": i, "action": "found"}         numbers[i] == target (último paso)
  {"index": None, "action": "not_found"}  se acabó la lista (último paso)

Quita el marcador xfail cuando linear_search devuelva los pasos.
"""

import pytest

from algorithms.searching.linear_search import linear_search

pytestmark = pytest.mark.xfail(
    reason="Pendiente: linear_search debe devolver (índice, steps)",
    strict=False,
)


def test_empty_list():
    result, steps = linear_search([], 10)

    assert result == -1
    assert steps == [{"index": None, "action": "not_found"}]


def test_existing_element_in_unsorted_list():
    numbers = [42, 7, 19, 3]

    result, steps = linear_search(numbers, 19)

    assert result == 2
    assert [step["action"] for step in steps] == ["compare", "compare", "found"]
    assert [step["index"] for step in steps] == [0, 1, 2]


def test_non_existing_element():
    numbers = [42, 7, 19, 3]

    result, steps = linear_search(numbers, 100)

    assert result == -1
    assert len(steps) == len(numbers) + 1
    assert steps[-1] == {"index": None, "action": "not_found"}


def test_returns_first_match():
    result, steps = linear_search([5, 8, 5], 5)

    assert result == 0
    assert steps == [{"index": 0, "action": "found"}]
