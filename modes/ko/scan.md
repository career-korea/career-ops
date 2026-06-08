# 모드: scan — 포털 스캐너 (공고 발견)

설정된 채용 포털을 스캔하고, 제목 관련성으로 필터링한 뒤, 새 공고를 후속 평가를 위해 파이프라인에 추가한다.

> **참고 (v1.6+):** 기본 스캐너(`scan.mjs` / `npm run scan`)는 **zero-token**이며 구조화된 소스를 쓴다: 회사별로 설정된 로컬 파서와 Greenhouse, Ashby, Lever의 공개 API. 아래 설명하는 Playwright/WebSearch 레벨은 **에이전트** 흐름(Claude/Codex가 실행)이며 `scan.mjs`가 하는 일이 아니다. 어떤 회사에 로컬 파서도 Greenhouse/Ashby/Lever API도 없으면 `scan.mjs`는 그 회사를 무시한다; 그런 경우 에이전트가 Level 1(Playwright) 또는 Level 3(WebSearch)을 수동으로 처리해야 한다.
>
> **규칙 (v1.8+):** 어떤 회사의 로컬 파서가 Level 0에서 성공하면, 에이전트는 그 회사를 Playwright(Level 1)나 API(Level 2)에서 **반복하지 않는다**. Level 3에서는 일반 쿼리가 계속 활성화되지만, 이미 파서로 커버된 회사의 결과는 버린다. [규칙: 로컬 파서 성공](#규칙-로컬-파서-성공--비싼-스크래핑-반복-금지) 참조.

## 권장 실행

main 컨텍스트를 소비하지 않도록 서브에이전트로 실행:

```
Agent(
    subagent_type="general-purpose",
    prompt="[이 파일의 내용 + 구체적 데이터]",
    run_in_background=True
)
```

## 설정

`portals.yml`을 읽으며, 다음을 포함한다:
- `search_queries`: 포털별 `site:` 필터가 있는 WebSearch 쿼리 목록 (광범위 발견)
- `tracked_companies`: 직접 탐색을 위한 `careers_url`이 있는 특정 회사
- `tracked_companies[].parser`: SSR 페이지나 안정적 HTML을 위한 선택적 로컬 파서
- `title_filter`: 제목 필터링을 위한 positive/negative/seniority_boost 키워드

## 발견 전략 (4단계)

### Level 0 — 로컬 파서 (가장 저렴)

**`parser:`가 설정된 `tracked_companies`의 각 회사에 대해:** `portals.yml`에 정의된 로컬 파서를 실행한다. 이 레벨은 careers 페이지가 SSR이나 안정적 HTML을 쓰고, 에이전트 도움 없이 공고를 추출하는 JavaScript/Python/기타 로컬 런타임 스크립트가 이미 존재할 때 이상적이다.

권장 계약:

```yaml
- name: Example Company
  careers_url: https://example.com/careers
  scan_method: local_parser
  parser:
    command: node
    script: scripts/parsers/example-company-jobs.js
    format: jobs-json-v1
  enabled: true
```

보통 파서는 특정 회사 전용이며 URL, 셀렉터, 페이지네이션을 이미 안다. `args`는 선택사항: 스크립트 작성자에게 도움되는 방식으로 사용 — 예: 회사 간 재사용, `{careers_url}`/`{company}` 전달, 디버그 플래그 활성화, JSON 스냅샷 저장, 또는 파서 고유 동작 제어.

파서는 stdout에 JSON을 출력해야 한다:

배열 형식:

```json
[
  { "title": "Senior AI Engineer", "url": "https://example.com/jobs/123", "location": "Remote" }
]
```

`jobs` 키 객체 형식:

```json
{
  "jobs": [
    { "title": "Senior AI Engineer", "url": "https://example.com/jobs/123", "location": "Remote" }
  ]
}
```

`results` 키 객체 형식:

```json
{
  "results": [
    { "title": "Senior AI Engineer", "url": "https://example.com/jobs/123", "location": "Remote" }
  ]
}
```

`company`는 선택사항; 없으면 `scan.mjs`가 `tracked_companies`의 이름을 사용한다.

스캐너는 stdout을 읽은 후 전체 JSON을 보존할 필요가 없다. 파서가 감사나 디버그용 아티팩트도 생성하면 `data/parser-output/{company}/`에 저장하고 git 밖에 둔다 (JSON은 `.gitignore`; `.gitkeep`은 구조 보존을 위해 git에 유지).

### 규칙: 로컬 파서 성공 — 비싼 스크래핑 반복 금지

`scan_method: local_parser`의 목적은 **토큰 절감**이다: LLM이 같은 회사를 Playwright나 중복 API로 다시 스크래핑하지 않게 한다.

에이전트 스캔 중 **`local_parser_ok`** 집합을 메모리에 유지: Level 0이 성공한 회사 이름(`tracked_companies[].name`):

- `parser.command` + `parser.script`가 존재하고 스크립트가 치명적 오류 없이 실행됨
- stdout이 유효한 JSON (`[]`, `{ jobs: [] }`, 또는 `{ results: [] }`)
- 프로세스 타임아웃이나 크래시 없음

| 레벨 | 회사가 `local_parser_ok`에 있으면 |
|-------|----------------------------------------|
| **1 — Playwright** | **건너뜀** — `careers_url`로 `browser_navigate` 안 함 (토큰상 가장 비싼 방법) |
| **2 — API** | **건너뜀** — `api:`를 WebFetch 안 함 (이미 파서로 커버; `scan.mjs`도 파서 성공 후 API를 안 씀) |
| **3 — WebSearch** | **일반** 쿼리 실행 (`site:`, 역할 제목); 정규화된 회사가 `local_parser_ok`와 일치하는 각 히트는 **버림** |

**예외:**

- 파서 **실패** → 회사는 `local_parser_ok`에 **들어가지 않음**; Level 1, 2가 정상 적용 (파서 실패 후 ATS API가 있을 때 `scan.mjs`의 폴백과 동일 기준).
- Level 3: 횡단 쿼리(`site:jobs.ashbyhq.com`, `site:boards.greenhouse.io` 등)를 비활성화하지 않음 — **새** 회사 발견에 쓰임. 파서가 성공한 `tracked_companies`에 이미 있는 회사의 결과만 필터.
- 로컬 파서가 활성인 회사에 전용 `search_queries`를 만들지 않음 (예: `site:jobs.ashbyhq.com/cohere "AI Engineer"`); 파서를 쓰거나, 실패하면 Playwright/API.

**권장 Level 0:** 에이전트 워크플로 시작 시 `node scan.mjs`(또는 `npm run scan`)를 실행. 이것이 로컬 파서 + API를 zero-token 한 단계로 커버하고, 어떤 회사가 `local-parser`로 성공했는지 반환한다.

### Level 1 — Playwright 직접 (주력)

**`local_parser_ok`에 없는 `tracked_companies`의 각 회사에 대해:** Playwright(`browser_navigate` + `browser_snapshot`)로 `careers_url`로 이동해, 보이는 모든 공고를 읽고, 각각의 제목 + URL을 추출한다. 가장 신뢰성 높은 방법인 이유:
- 페이지를 실시간으로 봄 (Google 캐시 결과 아님)
- SPA에서 작동 (Ashby, Lever, Workday)
- 새 공고를 즉시 감지
- Google 색인에 의존하지 않음

**모든 회사는 portals.yml에 `careers_url`이 있어야 한다.** 없으면 한 번 찾아 저장하고, 이후 스캔에서 사용.

### Level 2 — ATS API / 피드 (보완)

**`local_parser_ok`에 없는**, 공개 API나 구조화된 피드가 있는 회사는, JSON/XML 응답을 Level 1의 빠른 보완으로 사용한다. Playwright보다 빠르고 시각적 스크래핑 오류를 줄인다.

**현재 지원 (`{}` 안은 변수):**
- **Greenhouse**: `https://boards-api.greenhouse.io/v1/boards/{company}/jobs`
- **Ashby**: `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`
- **BambooHR**: 목록 `https://{company}.bamboohr.com/careers/list`; 공고 상세 `https://{company}.bamboohr.com/careers/{id}/detail`
- **Lever**: `https://api.lever.co/v0/postings/{company}?mode=json`
- **Teamtailor**: `https://{company}.teamtailor.com/jobs.rss`
- **Workday**: `https://{company}.{shard}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs`

**프로바이더별 파싱 규칙:**
- `greenhouse`: `jobs[]` → `title`, `absolute_url`
- `ashby`: GraphQL `ApiJobBoardWithTeams`에 `organizationHostedJobsPageName={company}` → `jobBoard.jobPostings[]` (`title`, `id`; payload에 없으면 공개 URL 구성)
- `bamboohr`: 목록 `result[]` → `jobOpeningName`, `id`; 상세 URL 구성 `https://{company}.bamboohr.com/careers/{id}/detail`; 전체 JD를 읽으려면 상세를 GET하고 `result.jobOpening` 사용 (`jobOpeningName`, `description`, `datePosted`, `minimumExperience`, `compensation`, `jobOpeningShareUrl`)
- `lever`: 루트 배열 `[]` → `text`, `hostedUrl` (폴백: `applyUrl`)
- `teamtailor`: RSS items → `title`, `link`
- `workday`: `jobPostings[]`/`jobPostings` (테넌트에 따라) → `title`, `externalPath` 또는 호스트에서 구성된 URL

### Level 3 — WebSearch 쿼리 (광범위 발견)

`site:` 필터가 있는 `search_queries`는 포털을 횡단으로 커버한다 (모든 Ashby, 모든 Greenhouse 등). 아직 `tracked_companies`에 없는 **새** 회사 발견에 유용하지만, 결과가 오래됐을 수 있다. `local_parser_ok` 회사의 히트를 필터한 뒤, 남은 결과는 Level 0~2와 중복 제거한다.

**실행 우선순위:**
1. Level 0: 로컬 파서 → `parser:`가 설정되고 스크립트가 존재하는 회사; `local_parser_ok` 구성
2. Level 1: Playwright → `careers_url`이 있는 `tracked_companies`, `local_parser_ok` **제외**
3. Level 2: API → `api:`가 있는 `tracked_companies`, `local_parser_ok` **제외**
4. Level 3: WebSearch → `enabled: true`인 모든 `search_queries`; `local_parser_ok` 회사의 히트는 버림

레벨은 가산적이다 — 순서대로 실행되고, 결과는 병합·중복 제거된다. `local_parser_ok` 회사는 Level 1, 2를 거치지 **않는다**; Level 3에서는 횡단 발견(같은 포털의 다른 회사)에만 기여한다.

## 워크플로우

1. **설정 읽기**: `portals.yml`
2. **이력 읽기**: `data/scan-history.tsv` → 이미 본 URL
3. **중복 제거 소스 읽기**: `data/applications.md` + `data/pipeline.md`

3.5. **Level 0 — 로컬 파서** (`scan.mjs`, zero-token):
   `local_parser_ok = []` 초기화.
   모든 파서 + API를 zero-token으로 커버하려면 `node scan.mjs`를 한 번 실행하는 것이 좋다; 수동으로 한다면 아래 로직을 반복한다.
   `enabled: true`, `parser.command`, 스크립트가 존재하는 `tracked_companies`의 각 회사에 대해:
   a. 셸 없이 로컬 실행으로 `parser.command`를 `parser.script` + `parser.args`와 함께 실행
   b. 인자의 `{careers_url}`, `{company}` 플레이스홀더 확장
   c. stdout에서 JSON 읽기 (`[]`, `{ jobs: [] }`, 또는 `{ results: [] }`)
   d. 각 job을 `{title, url, company, location}`으로 정규화
   e. 상대 URL을 `careers_url` 기준으로 해석
   f. 파서 실패 시 오류 기록, ATS API 폴백이 있으면 시도, 다른 회사로 계속 (`local_parser_ok`에 **추가 안 함**)
   g. 파서 성공 시 (c~e 단계가 치명적 오류 없이 완료), `entry.name`을 `local_parser_ok`에 추가하고 job을 후보에 누적

4. **Level 1 — Playwright 스캔** (3~5개 배치로 병렬):
   `enabled: true`, `careers_url` 정의됨, **이름이 `local_parser_ok`에 없는** `tracked_companies`의 각 회사에 대해:
   a. `careers_url`로 `browser_navigate`
   b. `browser_snapshot`으로 모든 공고 읽기
   c. 페이지에 필터/부서가 있으면 관련 섹션 탐색
   d. 각 공고에서 추출: `{title, url, company}`
   e. 페이지가 결과를 페이지네이션하면 추가 페이지 탐색
   f. 후보 목록에 누적
   g. `careers_url` 실패(404, 리디렉션) 시 `scan_query`를 폴백으로 시도하고 URL 갱신용으로 메모

5. **Level 2 — ATS API / 피드** (병렬):
   `api:` 정의됨, `enabled: true`, **이름이 `local_parser_ok`에 없는** `tracked_companies`의 각 회사에 대해:
   a. API/피드 URL을 WebFetch
   b. `api_provider`가 정의되면 그 파서 사용; 없으면 도메인으로 추론 (`boards-api.greenhouse.io`, `jobs.ashbyhq.com`, `api.lever.co`, `*.bamboohr.com`, `*.teamtailor.com`, `*.myworkdayjobs.com`)
   c. **Ashby**는 다음으로 POST 전송:
      - `operationName: ApiJobBoardWithTeams`
      - `variables.organizationHostedJobsPageName: {company}`
      - `jobBoardWithTeams` + `jobPostings { id title locationName employmentType compensationTierSummary }` GraphQL 쿼리
   d. **BambooHR**는 목록이 기본 메타데이터만 가져온다. 각 관련 항목에 대해 `id`를 읽고 `https://{company}.bamboohr.com/careers/{id}/detail`로 GET, `result.jobOpening`에서 전체 JD 추출. `jobOpeningShareUrl`이 있으면 공개 URL로 사용; 없으면 상세 URL 사용.
   e. **Workday**는 최소 `{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}`로 JSON POST를 보내고 결과가 소진될 때까지 `offset`으로 페이지네이션
   f. 각 job 추출·정규화: `{title, url, company}`
   g. 후보 목록에 누적 (Level 1과 중복 제거)

6. **Level 3 — WebSearch 쿼리** (가능하면 병렬):
   `enabled: true`인 `search_queries`의 각 쿼리에 대해 (포털/역할별 일반 쿼리 — 로컬 파서가 활성인 회사 전용 쿼리는 아님):
   a. 정의된 `query`로 WebSearch 실행
   b. 각 결과에서 추출: `{title, url, company}`
      - **title**: 결과 제목에서 (" @ " 또는 " | " 앞)
      - **url**: 결과 URL
      - **company**: 제목의 " @ " 뒤, 또는 도메인/경로에서 추출
   c. `company`(정규화)가 `local_parser_ok`의 이름과 일치하면 결과 **건너뜀**
   d. 나머지를 후보 목록에 누적 (Level 0+1+2와 중복 제거)

6. **제목으로 필터** — `portals.yml`의 `title_filter` 사용:
   - `positive` 키워드 중 최소 1개가 제목에 나타나야 함 (대소문자 무시)
   - `negative` 키워드는 0개여야 함
   - `seniority_boost` 키워드는 우선순위를 주지만 필수는 아님

6b. **위치로 필터 (선택)** — `portals.yml`의 `location_filter` 사용:
   - `location_filter` 블록이 없으면 모든 위치 통과 (기본 동작)
   - 공고의 위치가 비어 있으면 → 통과 (누락 데이터에 불이익 없음)
   - `block` 키워드가 하나라도 있으면 → 거부 (allow보다 우선)
   - `allow`가 비어 있으면 → 통과 (이미 block 통과)
   - `allow`가 비어 있지 않으면 → 최소 한 키워드 일치 필요
   - 모든 일치는 대소문자 무시 부분 문자열
   - 위치는 후속 감사를 위해 `scan-history.tsv`의 7번째 컬럼으로 보존

7. **3개 소스에 대해 중복 제거**:
   - `scan-history.tsv` → 이미 본 정확한 URL
   - `applications.md` → 이미 평가된 회사 + 정규화된 역할
   - `pipeline.md` → 대기 또는 처리됨에 이미 있는 정확한 URL

7.5. **WebSearch 결과(Level 3)의 활성 여부 검증** — 파이프라인 추가 전:

   WebSearch 결과는 오래됐을 수 있다 (Google이 결과를 몇 주~몇 달간 캐시). 만료된 공고를 평가하지 않도록, Level 3에서 온 각 새 URL을 Playwright로 검증한다. Level 1, 2는 본질적으로 실시간이라 이 검증이 필요 없다.

   Level 3의 각 새 URL에 대해 (순차 — Playwright 절대 병렬 금지):
   a. URL로 `browser_navigate`
   b. `browser_snapshot`으로 내용 읽기
   c. 분류:
      - **활성**: 직무 제목 보임 + 역할 설명 + 본문 내에 Apply/Submit 컨트롤 보임. 일반적인 header/navbar/footer 텍스트는 세지 않음.
      - **만료** (다음 신호 중 하나):
        - 최종 URL에 `?error=true` 포함 (Greenhouse는 공고가 닫히면 이렇게 리디렉션)
        - 페이지에 "job no longer available" / "no longer open" / "position has been filled" / "this job has expired" / "page not found" 포함
        - navbar와 footer만 보이고 JD 내용 없음 (내용 < ~300자)
   d. 만료면: `scan-history.tsv`에 status `skipped_expired`로 기록하고 버림
   e. 활성이면: 8단계로 계속

   **URL 하나가 실패해도 전체 스캔을 중단하지 않음.** `browser_navigate`가 오류(타임아웃, 403 등)면 `skipped_expired`로 표시하고 다음으로 계속.

8. **필터를 통과한 검증된 각 새 공고에 대해**:
   a. `pipeline.md`의 "Pending" 섹션에 추가: `- [ ] {url} | {company} | {title}`
   b. `scan-history.tsv`에 기록: `{url}\t{date}\t{query_name}\t{title}\t{company}\tadded`

9. **제목으로 필터된 공고**: `scan-history.tsv`에 status `skipped_title`로 기록
10. **중복 공고**: status `skipped_dup`로 기록
11. **만료된 공고 (Level 3)**: status `skipped_expired`로 기록

## WebSearch 결과에서 제목·회사 추출

WebSearch 결과는 다음 형식으로 온다: `"Job Title @ Company"` 또는 `"Job Title | Company"` 또는 `"Job Title — Company"`.

포털별 추출 패턴:
- **Ashby**: `"Senior AI PM (Remote) @ EverAI"` → title: `Senior AI PM`, company: `EverAI`
- **Greenhouse**: `"AI Engineer at Anthropic"` → title: `AI Engineer`, company: `Anthropic`
- **Lever**: `"Product Manager - AI @ Temporal"` → title: `Product Manager - AI`, company: `Temporal`

일반 정규식: `(.+?)(?:\s*[@|—–-]\s*|\s+at\s+)(.+?)$`

## 비공개 URL

공개적으로 접근 불가한 URL을 찾으면:
1. JD를 `jds/{company}-{role-slug}.md`에 저장
2. pipeline.md에 추가: `- [ ] local:jds/{company}-{role-slug}.md | {company} | {title}`

## 스캔 이력

`data/scan-history.tsv`는 본 모든 URL을 추적한다:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby — AI PM	PM AI	Acme	added
https://...	2026-02-10	Greenhouse — SA	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	Ashby — AI PM	SA AI	OldCo	skipped_dup
https://...	2026-02-10	WebSearch — AI PM	PM AI	ClosedCo	skipped_expired
```

## 출력 요약

```
포털 스캔 — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
실행한 쿼리: N
발견한 공고: 총 N
제목 필터 통과: N개 관련
중복: N (이미 평가됨 또는 파이프라인에 있음)
만료 폐기: N (죽은 링크, Level 3)
pipeline.md에 추가된 신규: N

  + {company} | {title} | {query_name}
  ...

→ 새 공고를 평가하려면 /career-ops pipeline 실행.
```

## careers_url 관리

`tracked_companies`의 각 회사는 `careers_url`을 가져야 한다 — 공고 페이지로의 직접 URL. 이로써 매번 검색을 피한다.

**규칙: 항상 회사의 공식 URL을 사용; 자체 공식 페이지가 없을 때만 ATS 엔드포인트에 의존.**

`careers_url`은 가능하면 항상 회사 자체 채용 페이지를 가리켜야 한다. 많은 회사가 내부적으로 Workday, Greenhouse, Lever를 쓰지만, 공고 ID를 자사 도메인으로만 노출한다. 공식 페이지가 있는데 직접 ATS URL을 쓰면 직무 ID가 일치하지 않아 거짓 410 오류가 날 수 있다.

| ✅ 올바름 (공식) | ❌ 첫 선택으로 잘못됨 (직접 ATS) |
|---|---|
| `https://careers.mastercard.com` | `https://mastercard.wd1.myworkdayjobs.com` |
| `https://openai.com/careers` | `https://job-boards.greenhouse.io/openai` |
| `https://stripe.com/jobs` | `https://jobs.lever.co/stripe` |

폴백: 직접 ATS URL만 있으면 먼저 회사 웹사이트로 이동해 공식 채용 페이지를 찾는다. 회사에 자체 공식 페이지가 없을 때만 직접 ATS URL 사용.

**플랫폼별 알려진 패턴:**
- **Ashby:** `https://jobs.ashbyhq.com/{slug}`
- **Greenhouse:** `https://job-boards.greenhouse.io/{slug}` 또는 `https://job-boards.eu.greenhouse.io/{slug}`
- **Lever:** `https://jobs.lever.co/{slug}`
- **BambooHR:** 목록 `https://{company}.bamboohr.com/careers/list`; 상세 `https://{company}.bamboohr.com/careers/{id}/detail`
- **Teamtailor:** `https://{company}.teamtailor.com/jobs`
- **Workday:** `https://{company}.{shard}.myworkdayjobs.com/{site}`
- **Custom:** 회사 자체 URL (예: `https://openai.com/careers`)

**플랫폼별 API/피드 패턴:**
- **Ashby API:** `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`
- **BambooHR API:** 목록 `https://{company}.bamboohr.com/careers/list`; 상세 `https://{company}.bamboohr.com/careers/{id}/detail` (`result.jobOpening`)
- **Lever API:** `https://api.lever.co/v0/postings/{company}?mode=json`
- **Teamtailor RSS:** `https://{company}.teamtailor.com/jobs.rss`
- **Workday API:** `https://{company}.{shard}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs`

**회사에 `careers_url`이 없으면:**
1. 알려진 플랫폼 패턴 시도
2. 실패 시 빠른 WebSearch: `"{company}" careers jobs`
3. Playwright로 탐색해 작동 확인
4. **찾은 URL을 portals.yml에 저장** — 이후 스캔용

**`careers_url`이 404나 리디렉션을 반환하면:**
1. 출력 요약에 메모
2. scan_query를 폴백으로 시도
3. 수동 갱신용으로 표시

## portals.yml 유지보수

- 새 회사를 추가할 때 **항상 `careers_url` 저장**
- 흥미로운 포털이나 역할을 발견하면 새 쿼리 추가
- 노이즈가 너무 많으면 `enabled: false`로 쿼리 비활성화
- 타깃 역할이 변하면 필터 키워드 조정
- 가까이 추적하고 싶은 회사를 `tracked_companies`에 추가
- `careers_url`을 주기적으로 검증 — 회사가 ATS 플랫폼을 바꾼다
