# 모드: pipeline -- 공고 인박스 처리

`data/pipeline.md`의 Pending URL을 순서대로 평가한다.

## 흐름

1. `data/pipeline.md`에서 `- [ ]` 항목을 찾는다.
2. 각 URL의 JD를 Playwright -> WebFetch -> WebSearch 순서로 확보한다.
3. 한국/글로벌 리모트 시장을 감지한다.
4. `modes/ko/auto-pipeline.md` 흐름으로 평가, 보고서, PDF, tracker 기록을 수행한다.
5. 처리된 항목은 Processed로 옮긴다.

## 한국 포털 주의사항

- 로그인 필요한 페이지는 `[!]`로 표시하고 JD 붙여넣기를 요청한다.
- 공고가 닫혔으면 `skipped_expired`로 기록한다.
- 동일 회사+역할이 이미 tracker에 있으면 새 항목을 만들지 않는다.

## 출력

```markdown
| # | Company | Role | Market | Score | PDF | Recommended action |
```

3개 이상 Pending이면 병렬 워커를 쓰되 Playwright는 동시에 여러 개 띄우지 않는다.
