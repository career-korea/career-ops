# 모드: batch — 채용공고 대량 처리

두 가지 사용 방식: **conductor --chrome**(실시간으로 포털 탐색) 또는 **standalone**(이미 수집된 URL용 스크립트).

## 아키텍처

```text
Conductor (헤디드 브라우저 모드)
  │
  │  Chrome: 포털 탐색 (로그인 세션)
  │  DOM을 직접 읽음 — 사용자가 실시간으로 모든 것을 봄
  │
  ├─ Job 1: DOM + URL에서 JD 읽기
  │    └─► 헤드리스 워커 → report .md + PDF + tracker-line
  │
  ├─ Job 2: 다음 클릭, JD + URL 읽기
  │    └─► 헤드리스 워커 → report .md + PDF + tracker-line
  │
  └─ 종료: tracker-additions 병합 → applications.md + 요약
```

각 워커는 깨끗한 200K 토큰 컨텍스트를 가진 헤드리스 자식 프로세스다. conductor는 오케스트레이션만 한다. CLI별 올바른 명령은 `AGENTS.md`의 **Headless / Batch Mode** 표 참조.

## 파일

```text
batch/
  batch-input.tsv               # URL (conductor 또는 수동)
  batch-state.tsv               # 진행 상황 (자동 생성, gitignore)
  batch-runner.sh               # 독립 실행 오케스트레이터 스크립트
  batch-prompt.md               # 워커용 프롬프트 템플릿
  logs/                         # 작업당 로그 1개 (gitignore)
  tracker-additions/            # 트래커 라인 (gitignore)
```

## 방식 A: Conductor --chrome

1. **상태 읽기**: `batch/batch-state.tsv` → 이미 처리된 것 식별
2. **포털 탐색**: Chrome → 검색 URL
3. **URL 추출**: 결과 DOM 읽기 → URL 목록 추출 → `batch-input.tsv`에 추가
4. **각 대기 중 URL에 대해**:
   a. Chrome: 공고 클릭 → DOM에서 JD 텍스트 읽기
   b. JD를 `/tmp/batch-jd-{id}.txt`에 저장
   c. 다음 순번 REPORT_NUM 계산
   d. Bash로 실행:

      ```bash
      # CLI의 헤드리스 명령 사용 (AGENTS.md — Headless / Batch Mode 참조)
      <headless-cmd> "Process this job. URL: {url}. JD: /tmp/batch-jd-{id}.txt. Report: {num}. ID: {id}"
      ```

   e. `batch-state.tsv` 업데이트 (completed/failed + score + report_num)
   f. `logs/{report_num}-{id}.log`에 로깅
   g. Chrome: 뒤로 가기 → 다음 공고
5. **페이지네이션**: 더 이상 공고가 없으면 → "다음" 클릭 → 반복
6. **종료**: `tracker-additions/` 병합 → `applications.md` + 요약

## 방식 B: 독립 실행 스크립트

```bash
batch/batch-runner.sh [OPTIONS]
```

옵션:
- `--dry-run` — 실행 없이 대기 작업 나열
- `--retry-failed` — 실패한 작업만 재시도
- `--start-from N` — ID N부터 시작
- `--parallel N` — N개 워커 병렬
- `--max-retries N` — 작업당 시도 횟수 (기본: 2)

## batch-state.tsv 형식

```text
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-...	2026-...	002	4.2	-	0
2	https://...	failed	2026-...	2026-...	-	-	Error msg	1
3	https://...	pending	-	-	-	-	-	0
```

## 재개 가능성

- 크래시 시 → 재실행 → `batch-state.tsv` 읽기 → 완료된 작업 건너뜀
- 락 파일(`batch-runner.pid`)이 이중 실행 방지
- 각 워커는 독립적: 작업 #47의 실패가 다른 작업에 영향 없음

## 워커 (헤드리스 모드)

각 워커는 `batch-prompt.md`를 시스템 프롬프트로 받는다. 자체 완결적이다. CLI의 헤드리스 명령 사용 — `AGENTS.md`의 **Headless / Batch Mode** 표 참조.

워커 산출물:
1. `reports/`의 `.md` 리포트
2. `output/`의 PDF
3. `batch/tracker-additions/{id}.tsv`의 트래커 라인
4. stdout으로 결과 JSON

## 오류 처리

| 오류 | 복구 |
|-------|----------|
| URL 접근 불가 | 워커 실패 → conductor가 `failed` 표시, 계속 |
| JD 로그인 뒤 | conductor가 DOM 읽기 시도. 실패 시 → `failed` |
| 포털 레이아웃 변경 | conductor가 HTML을 추론해 적응 |
| 워커 크래시 | conductor가 `failed` 표시, 계속. `--retry-failed`로 재시도 |
| conductor 크래시 | 재실행 → 상태 읽기 → 완료 작업 건너뜀 |
| PDF 실패 | .md 리포트는 저장됨. PDF는 보류 |
