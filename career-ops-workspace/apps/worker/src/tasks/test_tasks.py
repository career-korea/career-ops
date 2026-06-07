from src.celery_app import app

@app.task(name="src.tasks.test_tasks.add_numbers")
def add_numbers(x: int, y: int) -> int:
    print(f"[TEST TASK] -> Received request to compute sum of: {x} and {y}")
    result = x + y
    print(f"[TEST TASK] -> Calculation finished. Result: {result}")
    return result
