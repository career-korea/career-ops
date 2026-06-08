# 모드: tracker — 지원 현황 트래커

`data/applications.md`를 읽어서 보여준다.

**트래커 형식:**
```markdown
| # | 날짜 | 회사 | 역할 | Score | 상태 | PDF | Report |
```

가능한 상태: `Evaluated` → `Applied` → `Responded` → `Interview` → `Offer` / `Rejected` / `Discarded` / `SKIP`

- `Applied` = 후보자가 지원서를 제출함
- `Responded` = 리크루터/회사가 먼저 연락했고 후보자가 응답함 (인바운드)
- `Interview` = 면접 프로세스 진행 중

사용자가 상태 업데이트를 요청하면 해당 행을 수정한다.

다음 통계도 함께 보여준다:
- 전체 지원 수
- 상태별 분포
- 평균 Score
- PDF 생성 비율(%)
- Report 생성 비율(%)
