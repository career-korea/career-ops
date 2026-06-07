# 모드: batch — 대량 공고 배치 평가

여러 공고를 병렬 워커로 처리한다. 두 가지 실행 방식: **컨덕터(헤드 브라우저)** 또는 **스탠드얼론(URL 목록)**.

## 아키텍처

```
컨덕터 (헤드 브라우저)
  │
  │  Chrome: 포털 탐색 (로그인 세션 활용)
  │  DOM을 직접 읽음 — 사용자가 실시간 확인 가능
  │
  ├─ 공고 1: DOM에서 JD + URL 읽기
  │    └─► 헤드리스 워커 → 보고서 .md + PDF + 트래커 행
  │
  ├─ 공고 2: 다음 클릭, JD + URL 읽기
  │    └─► 헤드리스 워커 → 보고서 .md + PDF + 트래커 행
  │
  └─ 완료: tracker-additions 병합 → applications.md + 요약
```

## 파일 구조

```
batch/
  batch-input.tsv          # URL 목록
  batch-state.tsv          # 진행 상태 (자동 생성, gitignore)
  batch-runner.sh          # 스탠드얼론 실행 스크립트
  batch-prompt.md          # 워커 프롬프트 템플릿
  logs/                    # 공고별 로그 (gitignore)
  tracker-additions/       # 트래커 행 TSV (gitignore)
```

## 방식 A: 컨덕터 (헤드 브라우저)

1. `batch-state.tsv` 읽기 → 완료된 항목 건너뜀
2. Chrome으로 포털 접속 (원티드, 사람인, 잡코리아, 점핏 등)
3. URL 목록 추출 → `batch-input.tsv`에 추가
4. 각 대기 중 URL에 대해:
   a. Chrome으로 공고 클릭 → DOM에서 JD 읽기
   b. JD를 `/tmp/batch-jd-{id}.txt`에 저장
   c. 다음 순차 보고서 번호 계산
   d. 헤드리스 워커 실행 (`claude -p` 또는 해당 CLI):

      ```bash
      claude -p "이 공고를 처리하세요. URL: {url}. JD: /tmp/batch-jd-{id}.txt. 보고서: {num}. ID: {id}"
      ```

   e. `batch-state.tsv` 업데이트 (완료/실패 + 점수 + 보고서 번호)
   f. `logs/{num}-{id}.log`에 기록
   g. Chrome: 뒤로 → 다음 공고
5. 페이지네이션: 공고 없으면 "다음" 클릭 → 반복
6. 완료: `tracker-additions/` 병합 → `applications.md` + 요약

## 방식 B: 스탠드얼론 스크립트

```bash
batch/batch-runner.sh [옵션]
```

옵션:
- `--dry-run` — 실행 없이 대기 목록만 표시
- `--retry-failed` — 실패한 항목만 재시도
- `--start-from N` — N번 ID부터 시작
- `--parallel N` — N개 워커 병렬 실행
- `--max-retries N` — 항목당 최대 시도 횟수 (기본: 2)

## 진행 상태 TSV 형식

```
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-...	2026-...	002	4.2	-	0
2	https://...	failed	2026-...	2026-...	-	-	오류 메시지	1
3	https://...	pending	-	-	-	-	-	0
```

## 재개 가능성

- 중단 시 → 재실행 → `batch-state.tsv` 읽기 → 완료 항목 건너뜀
- 잠금 파일(`batch-runner.pid`)로 중복 실행 방지
- 각 워커 독립 실행: #47 실패해도 나머지 계속 진행

## 오류 처리

| 오류 | 복구 방법 |
|------|----------|
| URL 접근 불가 | 워커 실패 → `failed` 표시, 계속 진행 |
| 로그인 필요 공고 | 컨덕터가 DOM 읽기 시도. 실패 시 `failed` |
| 포털 레이아웃 변경 | 컨덕터가 HTML 분석 후 적응 |
| 워커 충돌 | `failed` 표시, 계속. `--retry-failed`로 재시도 |
| 컨덕터 충돌 | 재실행 → 상태 읽기 → 완료 항목 건너뜀 |
| PDF 생성 실패 | .md 보고서 저장됨. PDF는 `/career-ops pdf`로 수동 생성 |

## 한국 포털 주의사항

- **원티드/잡코리아/사람인**: JS 렌더링, 로그인 팝업 있을 수 있음
- **점핏**: 프로그래머스 계정 연동
- **네이버/카카오/삼성 채용**: 회사별 자체 ATS, 스크래핑 제한 있을 수 있음
- 로그인 필요 공고는 `[!]`로 표시 후 수동 처리 요청
