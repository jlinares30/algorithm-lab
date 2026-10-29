def binary_search(numbers: list[int], target: int, left = 0, right = None, steps=None) -> tuple[int, list[dict]]:
    if steps is None:
        steps = []
    if right is None:
        right = len(numbers)-1
    if(right < left):
        steps.append({
            "left": left,
            "mid": None,
            "right": right,
            "action": "not_found"
        })
        return -1, steps
    mid = (left + right)//2
    if(numbers[mid] == target):
        steps.append({
            "left": left,
            "mid": mid,
            "right": right,
            "action": "found"
        })
        return mid, steps
    if(numbers[mid] < target):
        steps.append({
            "left": left,
            "mid": mid,
            "right": right,
            "action": "move_right"
        })
        return binary_search(numbers,target, mid+1, right, steps)
    if(numbers[mid] > target):
        steps.append({
            "left": left,
            "mid": mid,
            "right": right,
            "action": "move_left"
        })
        return binary_search(numbers,target, left, mid-1, steps)


numbers = []

result, steps  = binary_search(numbers, 10)

print(result)
print(steps)