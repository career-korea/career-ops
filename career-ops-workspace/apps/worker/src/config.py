import os
from dotenv import load_dotenv

# 로컬 환경 변수(.env) 파일 로딩
load_dotenv()

# 1. 브로커 URL 및 결과 백엔드 URL 설정 (Redis 주소 획득)
broker_url = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/0")

# 2. Celery 결과값 관리 최적화 옵션
task_ignore_result = False  # E2E 성공 검증을 위해 임시 결과 기록 활성화
result_expires = 1800      # 30분간 결과 보존 후 만료

# 3. 로컬 테스트 및 대용량 분석 처리를 위한 동시 실행 수 제한 (개발 환경 최적화)
worker_concurrency = 2

