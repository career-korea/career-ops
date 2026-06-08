# 모드: pipeline — URL 인박스 (세컨드 브레인)

`data/pipeline.md`에 저장된 채용 URL을 처리한다. 사용자는 언제든 URL을 추가하고, 이후 `/career-ops pipeline`을 실행해 한꺼번에 처리한다.

## 워크플로우

1. **읽기** `data/pipeline.md` → "Pending" 섹션에서 `- [ ]` 항목을 찾는다
2. **각 대기 중 URL에 대해**:
   a. 다음 순번 `REPORT_NUM` 계산 (`reports/`를 읽어 가장 큰 번호 + 1)
   b. **JD 추출** — Playwright(browser_navigate + browser_snapshot) → WebFetch → WebSearch 순
   c. URL 접근 불가 → 메모와 함께 `- [!]`로 표시하고 계속 진행
   d. **전체 auto-pipeline 실행**: A-F 평가 → Report .md → PDF (점수 ≥ `auto_pdf_score_threshold`일 때) → 트래커
   e. **"Pending"에서 "Processed"로 이동**: `- [x] #NNN | URL | 회사 | 역할 | Score/5 | PDF ✅/❌`

   **PDF 게이트 (설정 가능):** `config/profile.yml` → `auto_pdf_score_threshold`를 읽는다. 키가 없으면 기본값 `3.0`(이 모드의 원래 게이트)을 적용한다. 평가 점수가 임계값보다 낮으면 PDF 생성을 건너뛴다: 리포트는 정상 작성하고, 헤더에 `**PDF:** 미생성 — 필요 시 /career-ops pdf {company-slug} 실행`을 표시하며, 트래커에 PDF ❌로 표시한다. 점수가 임계값 이상이면 평소대로 PDF를 생성한다.

   **튜닝:** 맞춤 PDF 생성은 항목당 약 30~60초(Playwright 실행 + HTML 렌더링)가 걸리고, 만들어진 파일은 자주 쓰이지 않는다 — 대부분의 역할은 2.x/3.x 점수대이고 지원 단계까지 가지 않는다. `auto_pdf_score_threshold`를 올리면(예: `4.0`) 경계선 공고는 리포트만 작성하고 PDF는 `/career-ops pdf {slug}`로 필요할 때 생성한다. `0`으로 두면 모든 공고에 PDF를 생성한다. 두 경로(Path A `/career-ops pipeline`, Path B `batch/batch-runner.sh`)가 같은 키를 읽으므로, 어느 경로로 처리하든 동작은 동일하다.
3. **대기 중 URL이 3개 이상이면**, 속도를 위해 에이전트를 병렬로 실행한다(Agent 도구 `run_in_background`).
4. **마지막에** 요약 표를 보여준다:

```
| # | 회사 | 역할 | Score | PDF | 권장 조치 |
```

## pipeline.md 형식

```markdown
## Pending
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job — 오류: 로그인 필요

## Processed
- [x] #143 | https://jobs.example.com/posting/789 | Acme Corp | AI PM | 4.2/5 | PDF ✅
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | SA | 2.1/5 | PDF ❌
```

## URL에서 지능적 JD 감지

1. **Playwright (우선):** `browser_navigate` + `browser_snapshot`. 모든 SPA에서 작동.
2. **WebFetch (대체):** 정적 페이지 또는 Playwright 사용 불가 시.
3. **WebSearch (최후):** JD를 색인하는 2차 포털에서 검색.

**특수 케이스:**
- **LinkedIn**: 로그인이 필요할 수 있음 → `[!]`로 표시하고 사용자에게 텍스트 붙여넣기 요청
- **PDF**: URL이 PDF를 가리키면 Read 도구로 직접 읽기
- **`local:` 접두사**: 로컬 파일 읽기. 예: `local:jds/linkedin-pm-ai.md` → `jds/linkedin-pm-ai.md` 읽기

## 자동 번호 매기기

1. `reports/`의 모든 파일을 나열
2. 접두사에서 번호 추출 (예: `142-medispend...` → 142)
3. 새 번호 = 찾은 최대값 + 1

## 소스 동기화

URL을 처리하기 전에 동기화를 확인한다:
```bash
node cv-sync-check.mjs
```
비동기화가 있으면 계속하기 전에 사용자에게 경고한다.
