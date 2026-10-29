def linear_search(numbers: list[int], target: int) -> int:
    for index, value in enumerate(numbers):
        if target == value:
            return index;
    return -1;


array = []

print(linear_search(array, 10))