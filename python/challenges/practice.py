"""«Completa el código»: hides lines of a hand-written algorithm and checks
what the learner writes in their place.

This is tooling, not an algorithm. An answer is accepted when the completed
function behaves like the original on a set of small inputs, so any correct
way of writing the hidden line counts, not only the original text.
"""

import ast
import random

from challenges.faults import battery, load, run, same


def _function(source, name):
    return next(
        (node for node in ast.parse(source).body if isinstance(node, ast.FunctionDef) and node.name == name),
        None,
    )


def _mentions_steps(node):
    return any(isinstance(child, ast.Name) and child.id == "steps" for child in ast.walk(node))


def blank_candidates(source, name):
    """Line numbers that hold the algorithm's logic: conditions, loops, assignments and returns.

    Lines that only record steps (and the bookkeeping of the `steps` list) are
    never hidden: they are the contract with the interface, not the algorithm.
    """
    function = _function(source.replace("\r\n", "\n"), name)
    if function is None:
        return []
    found = set()
    for node in ast.walk(function):
        if isinstance(node, (ast.If, ast.While)):
            if node.lineno == node.test.end_lineno and not _mentions_steps(node.test):
                found.add(node.lineno)
        elif isinstance(node, ast.For):
            if node.lineno == node.iter.end_lineno:
                found.add(node.lineno)
        elif isinstance(node, ast.Return):
            if node.lineno == node.end_lineno:
                found.add(node.lineno)
        elif isinstance(node, (ast.Assign, ast.AugAssign)) and node.lineno == node.end_lineno:
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            if not all(isinstance(target, ast.Name) and target.id == "steps" for target in targets):
                found.add(node.lineno)
    return sorted(found)


def step_records(source, name):
    """Statements that only record a step: calls on the `steps` list.

    Each is {"start", "end", "action"}, with the lines it spans and the value
    of its "action" key when it is a plain string (None otherwise). The page
    folds them so the algorithm's logic reads without the bookkeeping.
    """
    function = _function(source.replace("\r\n", "\n"), name)
    if function is None:
        return []
    records = []
    for node in ast.walk(function):
        call = node.value if isinstance(node, ast.Expr) else None
        if not isinstance(call, ast.Call) or not isinstance(call.func, ast.Attribute):
            continue
        if not isinstance(call.func.value, ast.Name) or call.func.value.id != "steps":
            continue
        action = None
        for argument in call.args:
            if isinstance(argument, ast.Dict):
                for key, value in zip(argument.keys, argument.values):
                    if isinstance(key, ast.Constant) and key.value == "action":
                        if isinstance(value, ast.Constant) and isinstance(value.value, str):
                            action = value.value
        records.append({"start": node.lineno, "end": node.end_lineno, "action": action})
    return sorted(records, key=lambda record: record["start"])


def build_exercise(source, request):
    """The function's lines, with `count` of them marked as blanks, and its step records.

    request: {"algorithm", "seed", "count"}.
    """
    name = request["algorithm"]
    source = source.replace("\r\n", "\n")
    function = _function(source, name)
    candidates = blank_candidates(source, name)
    if function is None or not candidates:
        raise ValueError("No hay líneas que ocultar en este algoritmo.")
    rng = random.Random(request["seed"])
    hidden = set(rng.sample(candidates, min(request["count"], len(candidates))))
    lines = source.split("\n")
    return {
        "lines": [
            {
                "number": number,
                "indent": len(lines[number - 1]) - len(lines[number - 1].lstrip()),
                "text": lines[number - 1].strip(),
                "blank": number in hidden,
            }
            for number in range(function.lineno, function.end_lineno + 1)
        ],
        "records": step_records(source, name),
    }


def check_exercise(source, request):
    """Runs the function completed with the learner's lines against the original.

    request: {"algorithm", "answers": {line number: text}, "sorted", "seed"}.
    """
    name = request["algorithm"]
    source = source.replace("\r\n", "\n")
    lines = source.split("\n")
    for number, text in request["answers"].items():
        line = lines[int(number) - 1]
        lines[int(number) - 1] = line[: len(line) - len(line.lstrip())] + text.strip()
    completed = "\n".join(lines)
    try:
        compile(completed, f"{name}.py", "exec")
    except SyntaxError as error:
        return {"status": "syntax", "message": f"Línea {error.lineno}: {error.msg}"}
    function = load(completed, name)
    if function is None:
        return {"status": "syntax", "message": "El código completado no define la función."}

    correct = load(source, name)
    cases = battery(random.Random(request["seed"]), request["sorted"])
    failures = []
    for numbers, target in cases:
        expected = correct(list(numbers), target)
        outcome = run(function, numbers, target)
        if not same(expected, outcome):
            failures.append((numbers, target, expected, outcome))
    if not failures:
        return {"status": "passed", "total": len(cases)}
    # Show a case with a few elements when there is one: it is easier to follow.
    numbers, target, expected, outcome = next((failure for failure in failures if len(failure[0]) >= 3), failures[0])
    return {
        "status": "wrong",
        "failed": len(failures),
        "total": len(cases),
        "case": {
            "numbers": numbers,
            "target": target,
            "expected": {"index": expected[0], "steps": expected[1]},
            "actual": outcome,
        },
    }
