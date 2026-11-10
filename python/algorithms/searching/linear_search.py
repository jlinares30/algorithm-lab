def linear_search(numbers: list[int], target: int) -> tuple[int, list[dict]]:
    steps = []
    for index, value in enumerate(numbers):
        if target == value:
            steps.append({
                "action": "found",
                "current": value,
                "index": index
            })
            return index, steps
        steps.append({
            "action": "check",
            "current": value,
            "index": index
        })
    steps.append({
        "action": "not_found",
        "current": None,
        "index": None
    })
    return -1, steps

array = [3,6,7,10,8]

print(linear_search(array, 7))