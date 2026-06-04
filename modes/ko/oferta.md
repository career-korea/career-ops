# 모드: oferta -- 채용공고 A-G 평가

사용자가 JD 텍스트나 URL을 주면 7개 블록(A-F + G)을 작성한다. 한국어 JD는 한국어로, 영어 JD는 영어로 답한다. 단, 사용자가 한국어 결과를 원하면 한국어로 작성한다.

## Step 0 -- JD 확보와 시장 감지

URL이면 Playwright로 먼저 확인하고, 실패하면 WebFetch/WebSearch를 사용한다. JD에서 다음을 감지한다:
- 회사, 역할, 직무군, 시니어리티
- 시장: Korea / Global Remote / US / EU / Japan / 기타
- 고용형태: 정규직, 계약직, 프리랜서, EOR, contractor
- 근무형태: 원격, 하이브리드, 온사이트
- 시간대/위치/비자/언어 조건
- 보상 공개 여부와 통화

## Block A -- 역할 요약

표로 작성:
- 감지된 아키타입
- 시장/국가
- 도메인
- 역할 기능
- 시니어리티
- 근무 형태
- 고용 형태
- 시간대/위치 조건
- TL;DR 1문장

## Block B -- CV 매칭

`cv.md`를 읽고 JD 요구사항을 CV의 실제 근거와 매핑한다.

| JD 요구사항 | CV 근거 | 매칭 강도 | 코멘트 |
|---|---|---|---|

갭은 다음 기준으로 평가:
1. 하드 블로커인지 nice-to-have인지
2. 인접 경험으로 증명 가능한지
3. 포트폴리오/프로젝트로 보완 가능한지
4. 커버레터나 면접에서 어떻게 말할지

## Block C -- 레벨과 지원 전략

- JD 레벨과 후보자의 자연 레벨 비교
- 한국 회사면 직급/호칭/역할 범위의 불일치를 확인한다.
- 글로벌 리모트면 title inflation/downlevel 가능성을 확인한다.
- "과장 없이 senior로 보이는" 문구를 제안한다.
- 다운레벨 제안 시 수용 조건을 제안한다: 보상, 6개월 리뷰, 역할 범위, 승급 기준.

## Block D -- 보상과 수요

WebSearch로 최신 자료를 확인한다. 시장별 출처:
- 한국: 원티드, 점핏, 프로그래머스, 사람인, 잡플래닛, 블라인드, 리멤버, 회사 채용공고
- 글로벌 리모트: Levels.fyi, Glassdoor, Blind, Wellfound, RemoteOK, 회사 공개 salary band

표에 다음을 포함한다:
- 출처
- 범위/통화
- 정규직/계약직 구분
- 후보자 목표 대비 평가
- 불확실성

한국 공고는 다음도 확인한다:
- 포괄임금/고정 OT 여부
- 성과급/스톡옵션/사이닝 여부
- 수습기간
- 재택/하이브리드 정책

## Block E -- 맞춤화 계획

CV와 LinkedIn/포트폴리오에서 바꿀 부분을 제안한다.

| # | 섹션 | 현재 상태 | 제안 변경 | 이유 |
|---|---|---|---|---|

Top 5 CV 변경 + Top 5 LinkedIn/포트폴리오 변경을 제안한다.

## Block F -- 면접 계획

JD 요구사항별 STAR+R 스토리를 6-10개 만든다.

| # | JD 요구사항 | STAR+R 스토리 | S | T | A | R | Reflection |
|---|---|---|---|---|---|---|---|

한국 회사면 다음 질문도 준비한다:
- 왜 이 회사인가
- 이직 사유/공백/창업 경험
- 협업 방식과 갈등 해결
- 야근/온콜/속도에 대한 기대치
- 희망 연봉과 입사 가능일

글로벌 리모트면 다음 질문도 준비한다:
- 시간대 겹침
- 비동기 커뮤니케이션
- 계약 형태와 세금/인보이스
- 영어 커뮤니케이션

## Block G -- 공고 신뢰도

공고가 실제 활성 공고인지 평가한다.

신호:
- 게시일/수정일
- Apply 버튼 활성 여부
- JD 구체성
- 회사의 최근 채용/감원 뉴스
- 같은 공고 반복 재게시 여부
- 보상/근무지/고용형태 명확성
- 한국 공고면 포괄임금/근무지/계약형태 명확성

평가:
- High Confidence
- Proceed with Caution
- Suspicious

비난하지 말고 관찰 신호로 표현한다.

## 저장

평가 후 보고서를 `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`에 저장한다.

헤더:

```markdown
# Evaluation: {Company} -- {Role}

**Date:** {YYYY-MM-DD}
**URL:** {url}
**Market:** {Korea | Global Remote | ...}
**Archetype:** {detected}
**Score:** {X/5}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {path or pending}
```

신규 tracker 행은 직접 `applications.md`에 추가하지 말고 tracker-additions TSV 흐름을 따른다.
