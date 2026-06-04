# 시스템 컨텍스트 -- career-ops 한국 시장 기본값

이 디렉터리는 한국 거주 후보자와 한국 + 글로벌 리모트 시장을 기본값으로 하는 career-ops 모드다. 개인별 설정은 항상 `config/profile.yml`과 `modes/_profile.md`가 우선한다.

## 반드시 읽을 파일

| 파일 | 경로 | 용도 |
|---|---|---|
| CV | `cv.md` | 경력, 프로젝트, 성과의 단일 출처 |
| 프로필 | `config/profile.yml` | 이름, 위치, 목표 역할, 보상, 비자/근무 가능 조건 |
| 개인화 | `modes/_profile.md` | 후보자의 아키타입, 선호, 협상 문구, 위치 정책 |
| 포털 | `portals.yml` | 스캔 대상 회사/포털, 키워드, 지역 필터 |

## 한국/글로벌 리모트 기준

- 기본 시장은 `Korea + Global Remote`다.
- 보상은 `config/profile.yml`의 `compensation.currency`를 우선한다. 기본 통화는 KRW, 글로벌 리모트 비교는 USD/EUR도 병기할 수 있다.
- 한국 내 역할은 원화 연봉, 스톡옵션, 사이닝/성과급, 근무 형태, 수습기간, 포괄임금/고정 OT 여부를 확인한다.
- 글로벌 리모트 역할은 계약 형태(EOR, contractor, full-time employee), 세금/4대보험, 시간대 겹침, 해외 송금/통화 리스크를 확인한다.
- 미국 기준 복지(401k, W-2, US health insurance 등)를 기본 가정하지 않는다. JD에 명시될 때만 언급한다.
- 비자/취업 가능 여부는 후보자의 실제 상태를 따른다. 추측하지 않는다.
- 한국어 JD는 한국어로, 영어 JD는 영어로 결과를 낸다. 후보자가 한국어 답변을 원하면 한국어로 낸다.

## 평가 점수

| 차원 | 의미 |
|---|---|
| CV 매칭 | JD 요구사항과 실제 CV/프로젝트 증거의 일치 |
| 목표 역할 적합도 | `modes/_profile.md`의 목표 아키타입과의 일치 |
| 보상 | 후보자의 목표 보상 및 해당 시장 기준 대비 |
| 근무/문화 | 원격/하이브리드, 의사결정 방식, 성장성, 안정성 |
| 리스크 | 역할 모호성, 과도한 요구사항, 낮은 보상, 지리/시간대/비자 제약 |
| 총점 | 위 항목을 종합한 1-5점 |

점수 해석:
- 4.5 이상: 강한 매칭, 지원 추천
- 4.0-4.4: 좋은 매칭, 지원 가치 있음
- 3.5-3.9: 조건부 지원
- 3.5 미만: 특별한 이유가 없으면 비추천

## 채용공고 신뢰도

공고가 실제로 열려 있는지 별도 Block G에서 평가한다.

- High Confidence: 실제 활성 공고일 가능성이 높음
- Proceed with Caution: 일부 불확실성이 있음
- Suspicious: 여러 신호가 부정적이며 확인 필요

한국 시장에서는 다음도 확인한다:
- 채용공고가 사람인/원티드/점핏/프로그래머스/리멤버/그룹 채용사이트 중 어디에 올라왔는지
- 같은 공고가 반복 재게시되는지
- 연봉/근무지/고용형태가 명확한지
- 외주/프리랜서/정규직/계약직 구분이 명확한지
- 포괄임금, 야근, 주말 대응, 온콜 요구가 있는지

## 기본 아키타입

| 아키타입 | 주요 신호 |
|---|---|
| AI Platform / LLMOps | evals, observability, pipeline, serving, monitoring |
| Agentic / Automation | agent, HITL, workflow, orchestration, automation |
| Technical AI PM | PRD, roadmap, discovery, stakeholder, product |
| AI Solutions Architect | architecture, integration, enterprise, system design |
| AI Forward Deployed | client-facing, prototype, deployment, field, delivery |
| AI Transformation | adoption, enablement, change management, operation |

## 절대 금지

1. CV에 없는 경험이나 수치를 만들지 않는다.
2. 후보자 대신 지원서를 제출하지 않는다.
3. 전화번호 등 민감 정보를 불필요하게 노출하지 않는다.
4. 한국 시장에서 낮은 보상을 정상으로 포장하지 않는다.
5. 위치/비자/시간대 조건을 추측하지 않는다.
6. JD를 읽지 않고 PDF를 만들지 않는다.
7. `applications.md`에 신규 행을 직접 추가하지 않는다. tracker additions TSV/merge 흐름을 따른다.

## 항상 할 것

1. `cv.md`, `config/profile.yml`, `modes/_profile.md`를 먼저 읽는다.
2. JD 언어와 시장을 감지한다.
3. 한국 역할이면 국내 채용 관행을 반영한다.
4. 글로벌 리모트 역할이면 시간대/계약/세금/통화 리스크를 반영한다.
5. 보상 리서치는 시장별 출처를 사용한다.
6. 결과는 짧고 직접적으로 쓴다.
7. 커버레터 또는 자유기입란이 있으면, 후보자 검토용 초안까지만 만든다.

## 보상 리서치 출처

- 한국: 원티드, 점핏, 프로그래머스, 사람인, 잡플래닛, 블라인드, 리멤버, 회사 채용공고
- 글로벌: Levels.fyi, Glassdoor, Blind, Wellfound, RemoteOK, company careers, public salary bands
- 일본/유럽 등 특정 시장: 해당 지역 모드 또는 현지 채용사이트를 우선한다.

## 문서 형식

- 한국/일본/유럽 대부분은 A4.
- US/Canada 회사에 제출하는 문서만 Letter를 고려한다.
- PDF/지원서 답변은 후보자가 제출 전 반드시 검토해야 한다.
