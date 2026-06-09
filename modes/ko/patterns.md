# 모드: patterns — 거절 패턴 탐지기

## 목적

추적된 모든 지원을 분석해 결과의 패턴을 찾고 실행 가능한 인사이트를 도출한다. 무엇이 효과적인지(아키타입, 원격 정책, 점수 구간)와 무엇이 시간을 낭비하는지(지역 제한 역할, 스택 불일치, 저점수 지원)를 식별한다.

## 입력

- `data/applications.md` — 지원 트래커
- `reports/` — 개별 평가 리포트
- `config/profile.yml` — 사용자 프로필 (추천 맥락용)
- `modes/_profile.md` — 사용자 아키타입과 프레이밍
- `portals.yml` — 포털 설정 (필터 업데이트 추천용)

## 최소 임계값

분석 실행 전 확인: `data/applications.md`에 "Evaluated"를 넘어선 상태(Applied, Responded, Interview, Offer, Rejected, Discarded, SKIP)의 항목이 최소 5개 있는가?

없으면 사용자에게 알린다:
> "아직 데이터가 부족합니다 — {N}/5개 지원만 평가 단계를 넘어섰습니다. 계속 지원하고 분석할 결과가 더 쌓이면 다시 오세요."

우아하게 종료한다.

## Step 1 — 분석 스크립트 실행

실행:

```bash
node analyze-patterns.mjs
```

JSON 출력을 파싱한다. 포함 내용:

| 키 | 내용 |
|-----|----------|
| `metadata` | 전체 항목 수, 날짜 범위, 분석일, 결과별 카운트 |
| `funnel` | 상태 단계별 카운트 (evaluated, applied, interview, offer 등) |
| `scoreComparison` | 결과 그룹별 평균/최소/최대 점수 (positive, negative, self_filtered, pending) |
| `archetypeBreakdown` | 아키타입별: 총합, positive, negative, self_filtered, 전환율 |
| `blockerAnalysis` | 가장 빈번한 하드 블로커: 지역 제한, 스택 불일치, 시니어리티, 온사이트 |
| `remotePolicy` | 정책 버킷별: 총합, positive, negative, 전환율 |
| `companySizeBreakdown` | 규모별 버킷: startup, scaleup, enterprise |
| `scoreThreshold` | 권장 최소 점수 + 근거 |
| `techStackGaps` | negative 결과에서 가장 빈번한 기술 갭 |
| `recommendations` | 근거와 임팩트 레벨이 있는 상위 5개 실행 항목 |

스크립트가 `error`를 반환하면 오류 메시지를 표시하고 종료한다.

## Step 2 — 리포트 생성

`reports/pattern-analysis-{YYYY-MM-DD}.md`에 리포트를 작성한다.

### 리포트 구조

```markdown
# 패턴 분석 — {YYYY-MM-DD}

**분석한 지원:** {total}
**날짜 범위:** {from} ~ {to}
**결과:** positive {positive}, negative {negative}, self-filtered {self_filtered}, pending {pending}

---

## 전환 퍼널

각 상태를 카운트와 전체 대비 비율로 표시. 간단한 표 사용:

| 단계 | 카운트 | % |
|-------|-------|---|
| Evaluated | X | X% |
| Applied | X | X% |
| ... | | |

## 점수 vs 결과

| 결과 | 평균 점수 | 최소 | 최대 | 카운트 |
|---------|-----------|-----|-----|-------|
| Positive | X.X/5 | X.X | X.X | X |
| Negative | ... | | | |
| Self-filtered | ... | | | |
| Pending | ... | | | |

## 아키타입 성과

각 아키타입, 총 지원, positive 결과, 전환율 표.
최고 성과 아키타입과 최악을 강조.

## 주요 블로커

반복되는 하드 블로커(지역 제한, 스택 불일치 등)의 빈도 표.
각 블로커가 영향을 준 전체 지원 비율 표기.

## 원격 정책 패턴

원격 정책 버킷별(global, regional, geo-restricted, hybrid/onsite) 전환율 표.

## 기술 스택 갭

negative/self-filtered 결과에서 가장 흔한 누락 역량을 빈도와 함께 나열.

## 권장 점수 임계값

데이터 기반 최소 점수와 근거를 명시.

## 권장 사항

(스크립트 출력에서) 상위 권장 사항에 번호 매기기. 각각:
1. **[IMPACT]** 취할 조치
   권장 사항의 근거.
```

## Step 3 — 요약 제시

사용자에게 압축된 버전 표시:
1. 한 줄 통계 요약 (X개 지원, Y% 지원, Z% positive 결과)
2. 상위 3개 발견 (가장 임팩트 있는 패턴)
3. 전체 리포트 링크

예시:
> **패턴 분석 완료** (24개 지원, 4월 7~8일)
>
> 핵심 발견:
> - 지역 제한 역할은 전환율 0% (24개 중 7개) — US/Canada 전용 공고 평가 중단
> - 지역/글로벌 원격 역할은 57~67% 전환 — 여기가 스위트 스폿
> - 4.2/5 미만에서는 positive 결과 없음 — 이것을 점수 하한으로 고려
>
> 전체 리포트: `reports/pattern-analysis-2026-04-08.md`

## Step 4 — 권장 사항 적용 제안

사용자에게 권장 사항을 실행할지 묻는다:

> "이 권장 사항들을 적용해 드릴까요? 가능한 작업:
> - 지역 제한 역할을 걸러내도록 `portals.yml` 업데이트
> - PDF 생성을 위한 점수 임계값을 `_profile.md`에 설정
> - 전환되는 것에 맞춰 아키타입 타깃팅 조정
>
> 어느 것인지 말씀하시거나, 'all'이면 전부 적용합니다."

사용자가 동의하면:
- 포털 필터 변경: `portals.yml` 편집
- 프로필/아키타입 변경: `modes/_profile.md` 편집 (`_shared.md` 절대 금지)
- 점수 임계값: `config/profile.yml`의 `patterns` 키 아래 추가

## 결과 분류

참고로 결과는 다음과 같이 분류된다:

| 상태 | 결과 |
|--------|---------|
| Interview, Offer, Responded, Applied | **Positive** (노력 투입 또는 진전) |
| Rejected, Discarded | **Negative** (회사 거절 또는 공고 종료) |
| SKIP | **Self-filtered** (사용자가 지원 안 하기로 결정) |
| Evaluated | **Pending** (아직 조치 없음) |
