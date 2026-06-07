from celery import Celery
import sys

# 클라이언트 인스턴스도 동일한 파일시스템 브로커 설정을 가져옵니다.
app = Celery("career_ops_client")
app.config_from_object("src.config")

def send_mock_task():
    print("Initiating connection to local filesystem broker queue...")
    # 비동기로 add_numbers 태스크를 큐에 발행
    result = app.send_task("src.tasks.test_tasks.add_numbers", args=[10, 20])
    print("--------------------------------------------------")
    print(f"Status: Task queued successfully!")
    print(f"Task ID: {result.id}")
    print("Please inspect your Worker terminal for execution logs.")
    print("--------------------------------------------------")

if __name__ == "__main__":
    send_mock_task()
