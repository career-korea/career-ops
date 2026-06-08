# 모드: pdf — ATS 최적화 PDF 생성

## 전체 파이프라인

1. `cv.md`를 단일 진실 소스로 읽기
2. 컨텍스트에 JD가 없으면 사용자에게 요청 (텍스트 또는 URL)
3. JD에서 키워드 15~20개 추출
4. JD 언어 감지 → CV 언어 (EN 기본)
5. 회사 위치 감지 → 용지 형식:
   - US/Canada → `letter`
   - 그 외 전 세계 → `a4`
6. 역할 아키타입 감지 → 프레이밍 조정
7. JD 키워드 + 경력 전환 내러티브 브리지를 주입해 Professional Summary 재작성 ("사업을 만들고 매각함. 이제 시스템 사고를 [JD 도메인]에 적용 중.")
8. 공고에 가장 관련 있는 프로젝트 상위 3~4개 선택
9. JD 관련성 순으로 경력 불릿 재정렬
10. JD 요구사항으로 역량 그리드 구성 (키워드 구문 6~8개)
11. 기존 성과에 키워드를 자연스럽게 주입 (절대 지어내지 않음)
12. 템플릿 + 개인화 콘텐츠로 전체 HTML 생성
13. `config/profile.yml`에서 `name` 읽기 → 소문자 kebab-case로 정규화 (예: "John Doe" → "john-doe") → `{candidate}`
14. HTML을 `/tmp/cv-{candidate}-{company}.html`에 작성
15. 실행: `node generate-pdf.mjs /tmp/cv-{candidate}-{company}.html output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf --format={letter|a4}`
16. 보고: PDF 경로, 페이지 수, 키워드 커버리지 %

## ATS 규칙 (깔끔한 파싱)

- 단일 컬럼 레이아웃 (사이드바 없음, 병렬 컬럼 없음)
- 표준 헤더: "Professional Summary", "Work Experience", "Education", "Skills", "Certifications", "Projects"
- 이미지/SVG 안에 텍스트 없음
- PDF 헤더/푸터에 중요 정보 없음 (ATS가 무시함)
- UTF-8, 선택 가능한 텍스트 (래스터화 아님)
- 중첩 테이블 없음
- JD 키워드 분산: Summary (상위 5개), 각 역할의 첫 불릿, Skills 섹션

## PDF 디자인

- **폰트**: Space Grotesk (제목, 600-700) + DM Sans (본문, 400-500)
- **폰트 셀프 호스팅**: `fonts/`
- **헤더**: Space Grotesk 24px bold 이름 + 그라데이션 라인 `linear-gradient(to right, hsl(187,74%,32%), hsl(270,70%,45%))` 2px + 연락처 행
- **섹션 헤더**: Space Grotesk 13px, 대문자, letter-spacing 0.05em, cyan primary 색상
- **본문**: DM Sans 11px, line-height 1.5
- **회사명**: accent purple 색상 `hsl(270,70%,45%)`
- **여백**: 0.6in
- **배경**: 순백

## 섹션 순서 ("6초 리크루터 스캔" 최적화)

1. 헤더 (큰 이름, 그라데이션, 연락처, 포트폴리오 링크)
2. Professional Summary (3~4줄, 키워드 밀집)
3. Core Competencies (flex-grid에 키워드 구문 6~8개)
4. Work Experience (역순 시간순)
5. Projects (가장 관련 있는 상위 3~4개)
6. Education & Certifications
7. Skills (언어 + 기술)

## 키워드 주입 전략 (윤리적, 사실 기반)

정당한 재구성 예시:
- JD가 "RAG pipelines"라 하고 CV가 "LLM workflows with retrieval"이면 → "RAG pipeline design and LLM orchestration workflows"로 변경
- JD가 "MLOps"라 하고 CV가 "observability, evals, error handling"이면 → "MLOps and observability: evals, error handling, cost monitoring"으로 변경
- JD가 "stakeholder management"라 하고 CV가 "collaborated with team"이면 → "stakeholder management across engineering, operations, and business"로 변경

**후보자에게 없는 역량을 절대 추가하지 않는다. 정확한 JD 어휘로 실제 경험을 재표현만 한다.**

## 템플릿 HTML

`cv-template.html` 템플릿을 사용한다. `{{...}}` 플레이스홀더를 개인화 콘텐츠로 교체:

| 플레이스홀더 | 콘텐츠 |
|-------------|-----------|
| `{{LANG}}` | `en` 또는 `ko` |
| `{{PAGE_WIDTH}}` | `8.5in` (letter) 또는 `210mm` (A4) |
| `{{NAME}}` | (profile.yml에서) |
| `{{PHONE}}` | (profile.yml에서 — `profile.yml`에 비어 있지 않은 `phone` 값이 있을 때만 구분자와 함께 포함; 없으면 `<span>`과 `<span class="separator">` 모두 생략) |
| `{{EMAIL}}` | (profile.yml에서) |
| `{{LINKEDIN_URL}}` | [profile.yml에서] |
| `{{LINKEDIN_DISPLAY}}` | [profile.yml에서] |
| `{{PORTFOLIO_URL}}` | [profile.yml에서] (언어에 따라 /es 등) |
| `{{PORTFOLIO_DISPLAY}}` | [profile.yml에서] (언어에 따라 /es 등) |
| `{{LOCATION}}` | [profile.yml에서] |
| `{{SECTION_SUMMARY}}` | Professional Summary |
| `{{SUMMARY_TEXT}}` | 키워드가 포함된 개인화 요약 |
| `{{SECTION_COMPETENCIES}}` | Core Competencies |
| `{{COMPETENCIES}}` | `<span class="competency-tag">keyword</span>` × 6~8 |
| `{{SECTION_EXPERIENCE}}` | Work Experience |
| `{{EXPERIENCE}}` | 재정렬된 불릿이 있는 각 직무 HTML |
| `{{SECTION_PROJECTS}}` | Projects |
| `{{PROJECTS}}` | 상위 3~4개 프로젝트 HTML |
| `{{SECTION_EDUCATION}}` | Education |
| `{{EDUCATION}}` | Education HTML |
| `{{SECTION_CERTIFICATIONS}}` | Certifications |
| `{{CERTIFICATIONS}}` | Certifications HTML |
| `{{SECTION_SKILLS}}` | Skills |
| `{{SKILLS}}` | Skills HTML |

## Canva CV 생성 (선택)

`config/profile.yml`에 `cv.canva_resume_design_id`가 설정되어 있으면, 생성 전 사용자에게 선택지를 제공한다:
- **"HTML/PDF (빠름, ATS 최적화)"** — 위의 기존 흐름
- **"Canva CV (시각적, 디자인 보존)"** — 아래의 새 흐름

`cv.canva_resume_design_id`가 없으면 이 프롬프트를 건너뛰고 HTML/PDF 흐름 사용.

### Canva 워크플로우

#### Step 1 — 기본 디자인 복제

a. 기본 디자인(`cv.canva_resume_design_id` 사용)을 PDF로 `export-design` → 다운로드 URL 획득
b. 그 다운로드 URL로 `import-design-from-url` → 새 편집 가능 디자인(복제본) 생성
c. 복제본의 새 `design_id` 기록

#### Step 2 — 디자인 구조 읽기

a. 새 디자인에 `get-design-content` → 모든 텍스트 요소(richtext)와 내용 반환
b. 내용 매칭으로 텍스트 요소를 CV 섹션에 매핑:
   - 후보자 이름 찾기 → 헤더 섹션
   - "Summary" 또는 "Professional Summary" 찾기 → 요약 섹션
   - cv.md의 회사명 찾기 → 경력 섹션
   - 학위/학교명 찾기 → 학력 섹션
   - 스킬 키워드 찾기 → 스킬 섹션
c. 매핑 실패 시 찾은 내용을 사용자에게 보여주고 안내 요청

#### Step 3 — 맞춤 콘텐츠 생성

HTML 흐름과 동일한 콘텐츠 생성 (위 Step 1~11):
- JD 키워드 + 경력 전환 내러티브로 Professional Summary 재작성
- JD 관련성 순으로 경력 불릿 재정렬
- JD 요구사항에서 상위 역량 선택
- 키워드 자연스럽게 주입 (절대 지어내지 않음)

**중요 — 글자 수 예산 규칙:** 각 교체 텍스트는 반드시 교체 대상 원본 텍스트와 거의 같은 길이여야 한다(±15% 글자 수 이내). 맞춤 콘텐츠가 더 길면 압축한다. Canva 디자인은 고정 크기 텍스트 박스를 가지므로 — 긴 텍스트는 인접 요소와 겹친다. Step 2의 각 원본 요소 글자 수를 세고 교체 생성 시 이 예산을 지킨다.

#### Step 4 — 편집 적용

a. 복제 디자인에 `start-editing-transaction`
b. 각 섹션에 `find_and_replace_text`로 `perform-editing-operations`:
   - 요약 텍스트를 맞춤 요약으로 교체
   - 각 경력 불릿을 재정렬/재작성된 불릿으로 교체
   - 역량/스킬 텍스트를 JD 매칭 용어로 교체
   - 프로젝트 설명을 관련 상위 프로젝트로 교체
c. **텍스트 교체 후 레이아웃 재배치:**
   모든 텍스트 교체 후 텍스트 박스는 자동 크기 조정되지만 인접 요소는 제자리에 머문다. 이로 인해 경력 섹션 간 간격이 불균일해진다. 수정:
   1. `perform-editing-operations` 응답에서 업데이트된 요소 위치와 크기 읽기
   2. 각 경력 섹션(위→아래)에서 불릿 텍스트 박스가 끝나는 지점 계산: `end_y = top + height`
   3. 다음 섹션 헤더는 `end_y + consistent_gap`에서 시작해야 함 (템플릿의 원래 간격 사용, 보통 ~30px)
   4. `position_element`로 다음 섹션의 날짜, 회사명, 역할명, 불릿 요소를 이동해 균일한 간격 유지
   5. 모든 경력 섹션에 반복
d. **커밋 전 레이아웃 검증:**
   - `transaction_id`와 page_index=1로 `get-design-thumbnail`
   - 썸네일을 시각적으로 점검: 텍스트 겹침, 불균일 간격, 텍스트 잘림, 너무 작은 텍스트
   - 문제가 남으면 `position_element`, `resize_element`, `format_text`로 조정
   - 레이아웃이 깔끔할 때까지 반복
e. 최종 미리보기를 사용자에게 보여주고 승인 요청
f. 저장하려면 `commit-editing-transaction` (사용자 승인 후에만)

#### Step 5 — PDF 내보내기 및 다운로드

a. 복제본을 PDF로 `export-design` (JD 위치에 따라 a4 또는 letter)
b. **즉시** Bash로 PDF 다운로드:
   ```bash
   curl -sL -o "output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf" "{download_url}"
   ```
   내보내기 URL은 ~2시간 후 만료되는 사전 서명된 S3 링크다. 바로 다운로드.
c. 다운로드 검증:
   ```bash
   file output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf
   ```
   "PDF document"가 나와야 함. XML이나 HTML이 나오면 URL 만료 — 재내보내기 후 재시도.
d. 보고: PDF 경로, 파일 크기, Canva 디자인 URL (수동 조정용)

#### 오류 처리

- `import-design-from-url` 실패 → 메시지와 함께 HTML/PDF 파이프라인으로 폴백
- 텍스트 요소 매핑 불가 → 사용자에게 경고, 찾은 내용 표시, 수동 매핑 요청
- `find_and_replace_text`가 매칭을 못 찾음 → 더 넓은 부분 문자열 매칭 시도
- 자동 편집 실패 시 사용자가 수동 편집할 수 있도록 항상 Canva 디자인 URL 제공

## 생성 후

공고가 이미 등록되어 있으면 트래커 업데이트: PDF를 ❌에서 ✅로 변경.
