"""Generates «find the error» challenges from a correct, hand-written algorithm.

This is tooling, not an algorithm: it changes one small thing in the source of
an algorithm (a comparison, a ±1, a loop bound), runs the changed copy next to
the original and reports what each one recorded. The browser loads this file
as text and executes it with Pyodide; pytest imports it as a module.
"""

import ast
import contextlib
import io
import random
import sys

LINE_BUDGET = 20000
MAX_STEPS = 300

_TOKENS = {ast.Lt: "<", ast.LtE: "<=", ast.Gt: ">", ast.GtE: ">=", ast.Eq: "==", ast.NotEq: "!="}
_SWAPS = {
    ast.Lt: ["<=", ">"],
    ast.LtE: ["<"],
    ast.Gt: [">=", "<"],
    ast.GtE: [">"],
    ast.Eq: ["!="],
    ast.NotEq: ["=="],
}
_SLICEABLE = (ast.Name, ast.Attribute, ast.Subscript, ast.Call)


class _Stopped(BaseException):
    """Raised by the tracer when a run uses up its line budget."""


def _tracer():
    remaining = [LINE_BUDGET]

    def trace(frame, event, arg):
        if event == "line":
            remaining[0] -= 1
            if remaining[0] < 0:
                raise _Stopped()
        return trace

    return trace


def load(source, name):
    """Executes a complete algorithm file and returns its function, or None."""
    namespace = {"__name__": f"algorithm_lab_{name}"}
    try:
        sys.settrace(_tracer())
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(source, f"{name}.py", "exec"), namespace)
    except BaseException:
        # Example code at the bottom of a changed file may fail or never end;
        # the function defined above it is still usable.
        pass
    finally:
        sys.settrace(None)
    function = namespace.get(name)
    return function if callable(function) else None


def _recorded_steps(error):
    found = []
    trace = error.__traceback__
    while trace is not None:
        candidate = trace.tb_frame.f_locals.get("steps")
        if isinstance(candidate, list):
            found = candidate
        trace = trace.tb_next
    return found


def _clean(steps):
    return [step for step in steps if isinstance(step, dict)][:MAX_STEPS]


def run(function, numbers, target):
    """Calls an algorithm that may crash or never end, keeping the steps it recorded."""
    outcome = {"status": "finished", "index": None, "steps": [], "message": None}
    try:
        sys.settrace(_tracer())
        with contextlib.redirect_stdout(io.StringIO()):
            result = function(list(numbers), target)
        sys.settrace(None)
        if not isinstance(result, (tuple, list)) or len(result) != 2 or not isinstance(result[1], list):
            outcome["status"] = "crashed"
            outcome["message"] = "No devolvió (índice, steps)."
        else:
            outcome["index"] = result[0] if isinstance(result[0], int) else None
            outcome["steps"] = _clean(result[1])
    # Recursion that never stops runs out of stack before it runs out of lines.
    except (_Stopped, RecursionError) as error:
        sys.settrace(None)
        outcome["status"] = "endless"
        outcome["steps"] = _clean(_recorded_steps(error))
    except Exception as error:
        sys.settrace(None)
        outcome["status"] = "crashed"
        outcome["message"] = f"{type(error).__name__}: {error}"
        outcome["steps"] = _clean(_recorded_steps(error))
    return outcome


def _edits(function, lines):
    """Yields (line number, start column, end column, replacement) for each possible change."""

    def usable(node):
        return node.lineno == node.end_lineno and lines[node.lineno - 1].isascii()

    def visit(node):
        if isinstance(node, ast.Dict):
            return  # the recorded steps are never touched, only the logic
        if isinstance(node, ast.Compare) and len(node.ops) == 1 and type(node.ops[0]) in _SWAPS and usable(node):
            start, end = node.left.end_col_offset, node.comparators[0].col_offset
            gap = lines[node.lineno - 1][start:end]
            token = _TOKENS[type(node.ops[0])]
            if gap.count(token) == 1:
                for other in _SWAPS[type(node.ops[0])]:
                    yield node.lineno, start, end, gap.replace(token, other)
        if (
            isinstance(node, ast.BinOp)
            and isinstance(node.op, (ast.Add, ast.Sub))
            and isinstance(node.right, ast.Constant)
            and node.right.value == 1
            and usable(node)
        ):
            start, end = node.left.end_col_offset, node.right.col_offset
            gap = lines[node.lineno - 1][start:end]
            if gap.strip() in ("+", "-"):
                yield node.lineno, start, node.end_col_offset, ""
                yield node.lineno, start, end, "-" if gap.strip() == "+" else "+"
        if isinstance(node, ast.Constant) and node.value == 0 and not isinstance(node.value, bool) and usable(node):
            yield node.lineno, node.col_offset, node.end_col_offset, "1"
        if isinstance(node, ast.For):
            iterable = node.iter
            if isinstance(iterable, ast.Call) and isinstance(iterable.func, ast.Name) and iterable.func.id == "enumerate" and iterable.args:
                iterable = iterable.args[0]
            if isinstance(iterable, _SLICEABLE) and usable(iterable):
                for piece in ("[:-1]", "[1:]"):
                    yield iterable.lineno, iterable.end_col_offset, iterable.end_col_offset, piece
        for child in ast.iter_child_nodes(node):
            yield from visit(child)

    yield from visit(function)


def mutations(source, name):
    """Every single-change copy of the algorithm, as {line, original, mutated, source}."""
    source = source.replace("\r\n", "\n")
    lines = source.split("\n")
    function = next(
        (node for node in ast.parse(source).body if isinstance(node, ast.FunctionDef) and node.name == name),
        None,
    )
    if function is None:
        return []
    found = []
    for lineno, start, end, replacement in _edits(function, lines):
        line = lines[lineno - 1]
        changed = line[:start] + replacement + line[end:]
        found.append({
            "line": lineno,
            "original": line.strip(),
            "mutated": changed.strip(),
            "source": "\n".join(lines[: lineno - 1] + [changed] + lines[lineno:]),
        })
    return found


def same(expected, outcome):
    return outcome["status"] == "finished" and outcome["index"] == expected[0] and outcome["steps"] == _clean(expected[1])


def battery(rng, sorted_input):
    """Small inputs used to tell whether a change alters the behaviour at all."""
    cases = []
    for size in range(9):
        for _ in range(3):
            numbers = rng.sample(range(-20, 40), size)
            if sorted_input:
                numbers.sort()
            absent = rng.choice([value for value in range(-25, 45) if value not in numbers])
            cases.append((numbers, absent))
            if numbers:
                cases.append((numbers, rng.choice(numbers)))
    return cases


def build_challenge(source, request):
    """Picks a change that matters, runs it on the given list and reports both runs.

    request: {"algorithm", "numbers", "targets", "sorted", "seed", "mutation"?}.
    With "mutation" (a previous result), that same change is run on the new data.
    """
    name = request["algorithm"]
    numbers = request["numbers"]
    rng = random.Random(request["seed"])
    correct = load(source, name)
    targets = request["targets"]

    def outcomes(function):
        return {t: run(function, numbers, t) for t in targets}

    def worth_studying(results):
        """Targets that expose the fault in a run of several steps.

        A run of one step has a single place to mark, so it teaches nothing.
        """
        return [
            t for t in targets
            if len(results[t]["steps"]) >= 2 and not same(correct(list(numbers), t), results[t])
        ]

    mutation = request.get("mutation")
    faulty = load(mutation["source"], name) if mutation else None
    results = outcomes(faulty) if faulty else None
    if faulty is None:
        cases = battery(rng, request["sorted"])
        candidates = mutations(source, name)
        rng.shuffle(candidates)
        # Now and then any fault will do, so the short ones still turn up.
        any_fault = rng.random() < 0.15
        for candidate in candidates:
            function = load(candidate["source"], name)
            if not function or all(same(correct(list(n), t), run(function, n, t)) for n, t in cases):
                continue
            found = outcomes(function)
            if faulty is None:
                mutation, faulty, results = candidate, function, found
            if any_fault:
                break
            if worth_studying(found):
                mutation, faulty, results = candidate, function, found
                break
    if faulty is None:
        raise ValueError("No se pudo generar un fallo para este algoritmo.")

    # Most challenges use a target that exposes the fault; a few do not, so
    # «con estos datos no falla» stays a real answer.
    exposing = [t for t in targets if not same(correct(list(numbers), t), results[t])]
    hidden = [t for t in targets if t not in exposing]
    pool = exposing if exposing and (not hidden or rng.random() < 0.85) else hidden
    if pool is exposing:
        pool = worth_studying(results) or exposing
    target = rng.choice(pool)
    expected = correct(list(numbers), target)
    return {
        "mutation": mutation,
        "target": target,
        "expected": {"index": expected[0], "steps": expected[1]},
        "actual": results[target],
    }
