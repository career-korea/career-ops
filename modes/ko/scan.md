# 모드: scan -- 한국 + 글로벌 리모트 포털 스캐너

`portals.yml`을 읽어 새 채용공고를 찾고 `data/pipeline.md`에 추가한다. 기본 시장은 Korea + Global Remote다.

## 우선순위

1. `tracked_companies`의 `careers_url` 직접 확인
2. Greenhouse/Ashby/Lever/Workday 등 ATS API
3. `search_queries` 기반 WebSearch

한국 포털은 API 접근이 제한될 수 있으므로 Playwright 또는 WebSearch fallback을 사용한다.

## 한국 시장 포털

설정에 있으면 다음을 우선한다:
- Wanted
- Jumpit
- Programmers Career
- Saramin
- Remember
- RocketPunch
- company careers

## 필터

`title_filter`:
- positive keyword 중 하나 이상 포함
- negative keyword는 포함되면 제외
- seniority_boost는 우선순위만 높인다

`location_filter`:
- 없으면 모든 지역 통과
- `block`이 일치하면 제외
- `allow`가 비어 있으면 통과
- `allow`가 있으면 하나 이상 일치해야 통과

한국 기본 allow 예:
- Korea
- South Korea
- Seoul
- Pangyo
- Seongnam
- Bundang
- Remote
- Global
- APAC

## 중복 제거

다음과 비교한다:
- `data/scan-history.tsv`
- `data/applications.md`
- `data/pipeline.md`

같은 URL 또는 같은 회사+역할이면 중복으로 본다.

## 만료 확인

WebSearch 결과는 오래됐을 수 있으므로 Playwright로 확인한다. 제목, JD 본문, Apply 버튼이 보이면 활성으로 본다. 닫힌 공고는 `skipped_expired`로 기록한다.

## 출력

```markdown
Portal Scan -- {YYYY-MM-DD}

- 검색/스캔한 소스: N
- 발견: N
- 제목 필터 통과: N
- 중복 제외: N
- 만료 제외: N
- pipeline.md 추가: N

추가된 공고:
| Company | Role | Location | Source |
```

새 공고가 있으면 `/career-ops pipeline` 실행을 제안한다.
