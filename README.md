# career-ops
이제 파일을 옮기겠습니다. 제외 대상은 명확히 잡습니다: .git, .env, node_modules, venv, 빌드 산출물, 로그, 개인 데이터(cv.md, data/applications.md, data/pipeline.md, reports/*.md, output/*)는 제외합니다.

robocopy D:\career-ops D:\career-ops-fastapi-ts-real\_github_push /E /XD .git node_modules /XF .env cv.md package-lock.json /R:1 /W:1 실행함
원본 복사는 끝났고, .gitignore 때문에 portals.yml/config/profile.yml 같은 개인 설정은 작업 폴더에는 있어도 커밋 대상에서 빠집니다. 이제 웹 래퍼를 web-wrapper/로 넣고 별도 .gitignore를 추가하겠습니다.

robocopy D:\career-ops-fastapi-ts-real D:\career-ops-fastapi-ts-real\_github_push\web-wrapper /E /XD .git node_modules dist venv .venv314 _github_push /XF .env uvicorn.err.log uvicorn.out.log /R:1 /W:1 실행함
복사 중에 web-wrapper 내부의 .claude/settings.local.json와 Python __pycache__가 들어왔습니다. 이건 커밋하면 안 되는 로컬 산출물이라 지금 제거하고, web-wrapper/.gitignore도 추가하겠습니다.
