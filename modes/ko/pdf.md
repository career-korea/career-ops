# 모드: pdf -- 한국/글로벌 ATS 최적화 PDF

## 전체 흐름

1. `cv.md`를 단일 출처로 읽는다.
2. JD가 없으면 사용자에게 JD 텍스트나 URL을 요청한다.
3. JD에서 키워드 15-20개를 뽑는다.
4. JD 언어와 시장을 감지한다.
5. 문서 크기:
   - 한국, 일본, 유럽, 글로벌 리모트: `a4`
   - US/Canada 회사 제출: `letter`
6. 아키타입을 감지하고 요약/프로젝트/스킬을 재정렬한다.
7. `config/profile.yml`의 이름, 이메일, 위치, 포트폴리오를 사용한다.
8. HTML 생성 후 `node generate-pdf.mjs ... --format={a4|letter}`를 실행한다.

## 한국 시장 CV 기준

- 기본 언어는 JD 언어를 따른다. 한국어 JD는 한국어 CV, 영어 JD는 영어 CV를 우선한다.
- 한국 회사용 CV에는 연락처/이메일/포트폴리오/깃허브를 명확히 둔다.
- 생년월일, 주민번호, 상세 주소, 사진 등 민감 정보는 요구되지 않으면 넣지 않는다.
- 경력 요약은 3-4줄로 짧게 쓴다.
- 프로젝트/성과는 수치와 기술 스택을 같이 쓴다.

## ATS 규칙

- 단일 컬럼
- 텍스트는 선택 가능해야 한다.
- 이미지/SVG 안에 핵심 텍스트를 넣지 않는다.
- 표/중첩 레이아웃 최소화
- 섹션명은 JD 언어에 맞춘다.

## 키워드 삽입

JD 용어를 CV의 실제 경험에 맞게 바꿔 쓴다. 없는 기술/경험을 추가하지 않는다.

예:
- CV: "LLM workflow with retrieval" / JD: "RAG pipeline" -> "RAG pipeline and retrieval workflow"
- CV: "monitoring and error handling" / JD: "LLMOps observability" -> "LLMOps observability, monitoring, and error handling"

## 출력

PDF 경로, 페이지 수, 키워드 커버리지를 보고한다. 이미 tracker에 등록된 역할이면 PDF 상태 업데이트를 제안한다.
