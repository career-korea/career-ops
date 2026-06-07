import os
from dotenv import load_dotenv
from celery import Celery

# 파일 로딩을 위해 최상위에서 dotenv 로드 강제
load_dotenv()

app = Celery("career_ops_worker", include=["src.tasks.test_tasks"])

# 리팩토링한 Redis config 설정 주입
app.config_from_object("src.config")

if __name__ == "__main__":
    app.start()
