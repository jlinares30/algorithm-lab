"""Prueba de infraestructura; todavía no hay algoritmos que validar."""

from importlib import import_module
from pathlib import Path


def test_algorithms_package_is_importable():
    package = import_module("algorithms")
    expected = Path(__file__).resolve().parents[1] / "algorithms"
    assert Path(package.__file__).resolve().parent == expected
