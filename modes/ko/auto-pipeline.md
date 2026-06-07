# 모드: auto-pipeline -- 자동 평가/보고서/PDF/트래커

사용자가 JD 텍스트나 URL을 서브커맨드 없이 입력하면 전체 파이프라인을 실행한다.

## 1. JD 확보

URL이면 다음 순서로 JD를 확보한다:
1. Playwright: `browser_navigate` + `browser_snapshot`
2. WebFetch
3. WebSearch

한국 채용사이트(원티드, 점핏, 프로그래머스, 사람인, 리멤버 등)는 JS 렌더링/로그인/리다이렉트가 있을 수 있으므로 Playwright를 우선한다.

## 2. A-G 평가

`modes/ko/oferta.md` 기준으로 평가한다.

중요:
- 한국 공고는 국내 보상/근무 관행을 반영한다.
- 글로벌 리모트는 시간대/계약/세금/통화 리스크를 반영한다.
- 미국 기준 복지를 기본값으로 가정하지 않는다.

## 3. 보고서 저장

`reports/{###}-{company-slug}-{YYYY-MM-DD}.md`에 저장한다. 헤더에는 반드시 `URL`, `Market`, `Score`, `Legitimacy`, `PDF`를 포함한다.

## 4. PDF 생성

`config/profile.yml`의 `cv.output_format`을 확인한다.
- `latex`: `modes/latex.md` 흐름
- 기본: `modes/ko/pdf.md` 흐름

한국/글로벌 기본 문서 크기는 A4다. US/Canada 회사에 제출하는 경우만 Letter를 고려한다.

## 5. 지원서 답변 초안

점수 4.5 이상이면 지원서 자유기입란 초안을 만든다. 한국어 JD는 한국어, 영어 JD는 영어로 작성한다.

지원서 초안 톤:
- 후보자가 회사를 선택하는 입장으로 쓴다.
- 과장하지 않는다.
- JD의 구체 항목과 CV의 실제 증거를 연결한다.
- 2-4문장으로 짧게 쓴다.

## 6. 트래커

평가 결과를 tracker-additions TSV에 기록하고, 배치 후 `node merge-tracker.mjs`로 병합한다. 동일 company+role이 이미 있으면 새 행을 만들지 말고 기존 항목 업데이트를 제안한다.
