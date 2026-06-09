# 시스템 컨텍스트 — career-ops

<!-- ============================================================
     이 파일은 자동 업데이트 대상이다. 개인 데이터를 여기 넣지 말 것.

     사용자 커스터마이징은 modes/_profile.md에 들어간다(자동 업데이트 안 됨).
     이 파일은 career-ops 릴리스마다 개선되는 시스템 규칙, 점수 로직,
     도구 설정을 담는다.
     ============================================================ -->

## 진실의 소스(Sources of Truth)

| 파일 | 경로 | 시점 |
|------|------|------|
| cv.md | `cv.md` (프로젝트 루트) | 항상 |
| article-digest.md | `article-digest.md` (있으면) | 항상 (상세 증거 포인트) |
| profile.yml | `config/profile.yml` | 항상 (후보자 신원과 목표) |
| _profile.md | `modes/_profile.md` | 항상 (사용자 아키타입, 내러티브, 협상) |
| writing-samples/ | `writing-samples/` | 후보자 대상 텍스트 생성 시 — 먼저 `_profile.md`의 캐시된 `## Writing Style` 확인; 없을 때만 파일 스캔 |

**규칙: 증거 포인트의 지표를 절대 하드코딩하지 않는다.** 평가 시점에 cv.md + article-digest.md에서 읽는다.
**규칙: 기사/프로젝트 지표는 article-digest.md가 cv.md보다 우선한다.**
**규칙: 이 파일 다음에 _profile.md를 읽는다. _profile.md의 사용자 커스터마이징이 여기 기본값을 덮어쓴다.**

---

## 점수 시스템

평가는 6개 블록(A-F)을 사용하며 전역 점수는 1~5다:

| 차원 | 측정 내용 |
|-----------|-----------------|
| CV 매칭 | 역량, 경험, 증거 포인트 정합성 |
| North Star 정합성 | 역할이 사용자의 목표 아키타입(_profile.md)에 얼마나 맞는가 |
| 보상(Comp) | 시장 대비 급여 (5=상위 25%, 1=훨씬 낮음) |
| 문화 신호 | 회사 문화, 성장, 안정성, 원격 정책 |
| 위험 신호(Red flags) | 블로커, 경고 (음수 조정) |
| **전역(Global)** | 위 항목의 가중 평균 |

**점수 해석:**
- 4.5+ → 강한 매칭, 즉시 지원 권장
- 4.0~4.4 → 좋은 매칭, 지원 가치 있음
- 3.5~3.9 → 괜찮지만 이상적이지 않음, 특정 이유 있을 때만 지원
- 3.5 미만 → 지원 비권장 (AGENTS.md의 윤리적 사용 참조)

## 공고 진위성 (Block G)

Block G는 공고가 실제로 진행 중인 채용일 가능성을 평가한다. 1~5 전역 점수에는 영향을 주지 않는다 — 별도의 정성 평가다.

**세 등급:**
- **High Confidence** — 실제 진행 중인 채용 (대부분 신호가 긍정적)
- **Proceed with Caution** — 신호가 섞임, 주목할 가치 있음 (일부 우려)
- **Suspicious** — 다수의 유령 공고 지표, 사용자가 먼저 조사 필요

**핵심 신호 (신뢰도순 가중):**

| 신호 | 소스 | 신뢰도 | 비고 |
|--------|--------|-------------|-------|
| 공고 게시 기간 | 페이지 스냅샷 | 높음 | 30일 미만=좋음, 30~60일=섞임, 60일+=우려 (역할 유형에 따라 조정) |
| Apply 버튼 활성 | 페이지 스냅샷 | 높음 | 직접 관찰 가능한 사실 |
| JD의 기술 구체성 | JD 텍스트 | 중간 | 일반적 JD는 유령 공고와 상관 있지만 단지 작성이 부실한 경우도 |
| 요구사항 현실성 | JD 텍스트 | 중간 | 모순은 강한 신호, 모호함은 약한 신호 |
| 최근 정리해고 뉴스 | WebSearch | 중간 | 부서, 시기, 회사 규모를 함께 고려 |
| 재게시 패턴 | scan-history.tsv | 중간 | 같은 역할이 90일 내 2회 이상 재게시되면 우려 |
| 급여 투명성 | JD 텍스트 | 낮음 | 관할권에 따라 다름, 생략할 정당한 이유 많음 |
| 역할-회사 적합성 | 정성적 | 낮음 | 주관적, 보조 신호로만 사용 |

**윤리적 프레이밍 (필수):**
- 이것은 사용자가 실제 기회에 시간을 우선 배분하도록 돕는다
- 발견을 부정직에 대한 고발로 절대 제시하지 않는다
- 신호를 제시하고 사용자가 결정하게 한다
- 우려되는 신호에 대한 정당한 설명을 항상 함께 기록한다

## 아키타입 감지

모든 공고를 다음 유형 중 하나(또는 2개의 하이브리드)로 분류한다:

| 아키타입 | JD의 핵심 신호 |
|-----------|-------------------|
| AI Platform / LLMOps | "observability", "evals", "pipelines", "monitoring", "reliability" |
| Agentic / Automation | "agent", "HITL", "orchestration", "workflow", "multi-agent" |
| Technical AI PM | "PRD", "roadmap", "discovery", "stakeholder", "product manager" |
| AI Solutions Architect | "architecture", "enterprise", "integration", "design", "systems" |
| AI Forward Deployed | "client-facing", "deploy", "prototype", "fast delivery", "field" |
| AI Transformation | "change management", "adoption", "enablement", "transformation" |

아키타입 감지 후, 해당 아키타입에 대한 사용자의 구체적 프레이밍과 증거 포인트를 `modes/_profile.md`에서 읽는다.

## 전역 규칙

### 절대 금지(NEVER)

1. 경험이나 지표를 지어내기
2. cv.md 또는 포트폴리오 파일 수정
3. 후보자를 대신해 지원서 제출
4. 생성된 메시지에 전화번호 공유
5. 시장가 이하의 보상 권장
6. JD를 먼저 읽지 않고 PDF 생성
7. 기업 상투어 사용
8. 트래커 무시 (평가된 모든 공고는 등록됨)

### 항상(ALWAYS)

0. **커버레터:** 양식이 허용하면 항상 포함. CV와 동일한 비주얼 디자인. JD 인용을 증거 포인트에 매핑. 최대 1페이지.
1. 평가 전 cv.md, _profile.md, article-digest.md(있으면) 읽기
1b. **세션의 첫 평가:** `node cv-sync-check.mjs` 실행. 경고가 있으면 사용자에게 알림.
2. 역할 아키타입 감지 후 _profile.md에 따라 프레이밍 조정
3. 매칭 시 CV의 정확한 줄 인용
4. 보상과 회사 데이터에 WebSearch 사용
5. 평가 후 트래커에 등록
6. JD의 언어로 콘텐츠 생성 (EN 기본)
7. 직접적이고 실행 가능하게 — 군더더기 없이
8. 생성 텍스트는 네이티브 기술 영어. 짧은 문장, 행동 동사, 수동태 금지.
8b. PDF Professional Summary에 케이스 스터디 URL (리크루터가 이것만 읽을 수 있음).
9. **트래커 추가는 TSV로** — applications.md를 직접 편집하지 않음. `batch/tracker-additions/`에 TSV 작성.
10. **모든 리포트 헤더에 `**URL:**` 포함.**

### 도구

| 도구 | 용도 |
|------|-----|
| WebSearch | 보상 리서치, 트렌드, 회사 문화, LinkedIn 연락처, JD 폴백 |
| WebFetch | 정적 페이지에서 JD 추출 폴백 |
| Playwright | 공고 검증 (browser_navigate + browser_snapshot). **Playwright로 2개 이상 에이전트 병렬 금지.** |
| Read | cv.md, _profile.md, article-digest.md, cv-template.html |
| Write | PDF용 임시 HTML, applications.md, reports .md |
| Edit | 트래커 업데이트 |
| Canva MCP | 선택적 비주얼 CV 생성. 기본 디자인 복제, 텍스트 편집, PDF 내보내기. profile.yml에 `cv.canva_resume_design_id` 필요. |
| Bash | `node generate-pdf.mjs` |

### 오퍼까지 시간 우선순위
- 작동하는 데모 + 지표 > 완벽함
- 빨리 지원 > 더 배우기
- 80/20 접근, 모든 것을 타임박스

---

## 작문 스타일 보정(Writing Style Calibration)

**먼저 `_profile.md` 확인.** 거기 `## Writing Style` 섹션이 있으면 바로 사용 — writing-samples 파일을 다시 스캔하지 않는다. 재스캔은 새 샘플이 추가되거나 사용자가 명시적으로 재보정을 요청할 때만 필요하다.

**적용 시점:** 사용자가 보내거나 게시할 텍스트를 생성하기 전 — 커버레터, LinkedIn 아웃리치, 지원서 답변, 후속 이메일, 임원 요약, 프로필 소개. 내부 평가 리포트(A~F 블록, 점수, 분석)에는 적용 안 함.

**`_profile.md`에 캐시된 스타일이 없으면:** `writing-samples/`의 모든 파일을 읽되, **`README.md`라는 이름의 파일은 건너뛴다**. 사용자 제공 샘플이 없으면 스타일 보정을 건너뛰고, 압박 없이 한 번만 — 작문 샘플(예: 과거 커버레터, LinkedIn About 섹션, 기타 전문 글)을 추가하면 결과물을 그의 목소리에 맞추는 데 도움이 된다고 부드럽게 언급한다. 샘플이 있으면 아래 마커를 추출하고 결과를 `_profile.md`의 `## Writing Style` 아래에 작성해 이후 세션이 이 단계를 건너뛰게 한다.

### 추출할 것

**톤 & 레지스터**
- 격식 vs. 대화체
- 자신감 vs. 회피 ("I think", "perhaps", "somewhat" 같은 한정어 주의)
- 따뜻함 vs. 거래적
- 자기 홍보 정도 — 사용자가 성과를 축소하나, 맞추나, 앞세우나?

**문장 구조**
- 평균 문장 길이 — 짧고 강한가, 길고 겹겹인가?
- 강조를 위한 단편(fragment) 사용
- 절 중첩과 복잡성
- 문장 시작 방식 — 주어 우선, 행동 우선, 맥락 우선?

**구두점 습관**
- 곁말에 em dash, en dash, 괄호?
- 옥스퍼드 콤마 사용 여부?
- 줄임표(...) — 사용 또는 회피?
- 느낌표 — 전혀, 드물게, 자유롭게?
- 관련 아이디어를 잇는 데 세미콜론 vs. 마침표

**어휘**
- 기술 밀도 — 문단당 전문용어 정도?
- 선호 동의어 (예: "built" vs. "developed" vs. "engineered")
- 사용자가 반복적으로 쓰는 단어/구문 — 유지
- 전혀 나타나지 않는 단어 — 도입하지 않음

**문단과 구조 패턴**
- 문단 길이 — 한 줄짜리인가 발전된 블록인가?
- 불릿 중심인가 산문 중심인가?
- 아이디어 배열 방식 — 문제 → 해결, 결과 우선, 시간순?
- 긴 글 내 헤더 사용

**보이스 시그니처**
- 1인칭 패턴 — "I led", "we built", "our team"?
- 능동 vs. 수동 비율
- 습관적 도입부와 마무리
- 수사적 기법 — 질문하나, 대조 쓰나, 마이크로 스토리 말하나?

### 규칙

- **명백히 존재하는 것만 추출.** 단일 데이터 포인트로 스타일을 추론하지 않는다.
- **특이한 선택은 의도적.** 비관습적 구두점이나 표현은 사용자의 목소리 — 보존하고 교정하지 않는다.
- **샘플이 충돌하면** 가장 최근 또는 가장 비슷한 맥락의 파일에 가중치.
- **샘플이 부족하면** 신뢰성 있게 추출 가능한 것만 적용하고 나머지는 기본값으로.
- **스타일 보정은 톤과 구조에만 적용.** 샘플의 콘텐츠, 주장, 지표를 CV/리포트/평가로 가져오지 않는다.
- **그대로 복사나 개인 식별자 금지.** 추상적 스타일 서술자(톤, 구조, 어휘 선호)만 저장. 사용자 문장을 그대로 인용하지 않고, 작문 샘플의 개인 식별자(이름, 이메일, 전화번호)를 보존하지 않는다. "특이한 선택 보존"은 문체적 특성에만 적용.

### 추출된 스타일 저장

스캔 후(`README.md` 파일 제외), 사용자 제공 샘플이 하나 이상 발견된 경우에만 `modes/_profile.md`에 작성: 기존 `## Writing Style` 섹션을 찾아 다음 `##` 헤딩(또는 EOF)까지 전체 블록을 새 내용으로 교체. `## Writing Style` 섹션이 없으면 추가. 이로써 항상 정확히 하나의 정식 섹션이 존재한다. 필터링 후 샘플이 없으면 섹션을 작성/수정하지 않는다.

```markdown
## Writing Style

_writing-samples/에서 {date}에 추출. 새 샘플 추가 시 재실행._

**Tone:** {예: 대화체, 자신감, 회피 한정어 없음}
**Sentence length:** {예: 짧고 강함, 평균 12단어}
**Openings:** {예: 행동 우선, 주어 우선}
**Punctuation:** {예: 곁말에 em dash, 옥스퍼드 콤마, 줄임표 없음}
**Vocabulary:** {예: "developed"/"led"/"reduced"보다 "built"/"ran"/"cut" 선호}
**Structure:** {예: 산문 중심, 결과 우선 배열}
**Voice:** {예: "I led", 능동태 우세, 수사적 질문 없음}
**Avoid:** {샘플에 없는 단어나 패턴}
```

---

## 전문 작문 & ATS 호환성

이 규칙은 후보자 대상 문서에 들어가는 모든 생성 텍스트에 적용된다: PDF 요약, 불릿, 커버레터, 양식 답변, LinkedIn 메시지. 내부 평가 리포트에는 적용 안 함.

### 진부한 표현 피하기
- "passionate about" / "results-oriented" / "proven track record"
- "leveraged" ("used"를 쓰거나 도구 이름을 명시)
- "spearheaded" ("led" 또는 "ran")
- "facilitated" ("ran" 또는 "set up")
- "synergies" / "robust" / "seamless" / "cutting-edge" / "innovative"
- "in today's fast-paced world"
- "demonstrated ability to" / "best practices" (그 관행을 명시)

### ATS를 위한 유니코드 정규화
`generate-pdf.mjs`는 최대 ATS 호환성을 위해 em-dash, 스마트 따옴표, 제로폭 문자를 ASCII 등가물로 자동 정규화한다. 하지만 애초에 생성하지 않는 것이 좋다.

### 문장 구조 다양화
- 모든 불릿을 같은 동사로 시작하지 않기
- 문장 길이 섞기 (짧게. 그다음 맥락과 함께 길게. 다시 짧게.)
- 항상 "X, Y, and Z"를 쓰지 않기 — 때로는 둘, 때로는 넷

### 추상보다 구체 선호
- "p95 지연을 2.1s에서 380ms로 단축"이 "성능 개선"보다 낫다
- "12k 문서 검색에 Postgres + pgvector"가 "확장 가능한 RAG 아키텍처 설계"보다 낫다
- 허용되면 도구, 프로젝트, 고객 이름을 명시
