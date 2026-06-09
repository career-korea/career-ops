# 모드: latex — LaTeX/Overleaf CV 내보내기

맞춤형 ATS 최적화 CV를 `.tex` 파일로 내보내고 `tectonic` 또는 `pdflatex`로 PDF로 컴파일한다.

## 파이프라인

1. `cv.md`를 단일 진실 소스로 읽기
2. `config/profile.yml`에서 후보자 신원과 연락처 정보 읽기
3. 컨텍스트에 JD가 없으면 사용자에게 요청 (텍스트 또는 URL)
4. JD에서 키워드 15~20개 추출
5. JD 언어 감지 → CV 언어 (EN 기본)
6. 역할 아키타입 감지 → 프레이밍 조정
7. JD 키워드를 주입해 Professional Summary 재작성 (`pdf` 모드와 동일 규칙 — 없는 역량 절대 지어내지 않음)
8. 공고에 가장 관련 있는 프로젝트 상위 3~4개 선택
9. JD 관련성 순으로 경력 불릿 재정렬
10. 기존 성과에 키워드를 자연스럽게 주입
11. `templates/cv-template.tex`로 `.tex` 파일 생성
12. `output/cv-{candidate}-{company}-{YYYY-MM-DD}.tex`에 작성
13. 실행: `node generate-latex.mjs output/cv-{candidate}-{company}-{YYYY-MM-DD}.tex output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf`
14. 보고: .tex 경로, .pdf 경로, 파일 크기, 섹션 수, 키워드 커버리지 %

**필요 조건:** PATH에 `tectonic`(우선 — `brew install tectonic`, 패키지 자동 다운로드) 또는 `pdflatex`(MiKTeX / TeX Live).

## 템플릿 플레이스홀더

`templates/cv-template.tex` 템플릿은 `{{PLACEHOLDER}}` 문법을 사용한다:

| 플레이스홀더 | 소스 |
|-------------|--------|
| `{{NAME}}` | `profile.yml → candidate.full_name` |
| `{{CONTACT_LINE}}` | 전화 / 도시, 주 / 비자 상태 — profile.yml에서 구성 |
| `{{EMAIL_URL}}` | `mailto:` URL용 원본 이메일 — LaTeX 이스케이프 금지 (profile.yml에서) |
| `{{EMAIL_DISPLAY}}` | 표시용 이스케이프된 이메일 — `_` 같은 LaTeX 특수문자는 이스케이프, 예: `first\_name@example.com` |
| `{{LINKEDIN_URL}}` | `\href{}`용 스킴 포함 전체 URL: 예 `https://linkedin.com/in/username`. `profile.yml`이 스킴 없는 host+path만 저장하면 치환 전 `https://` 추가 |
| `{{LINKEDIN_DISPLAY}}` | 표시 텍스트만 (스킴 없음): `linkedin.com/in/username` |
| `{{GITHUB_URL}}` | `\href{}`용 스킴 포함 전체 URL: 예 `https://github.com/username`. 스킴 없는 host+path만 저장 시 `https://` 추가 |
| `{{GITHUB_DISPLAY}}` | 표시 텍스트만 (스킴 없음): `github.com/username` |
| `{{EDUCATION}}` | cv.md Education 섹션의 LaTeX `\resumeSubheading` 블록 |
| `{{EXPERIENCE}}` | LaTeX `\resumeSubheading` + `\resumeItem` 블록 — 재정렬된 불릿 |
| `{{PROJECTS}}` | LaTeX `\resumeProjectHeading` + `\resumeItem` 블록 — 선택된 상위 3~4개 |
| `{{SKILLS}}` | cv.md Technical Skills의 LaTeX `\textbf{Category}{: items}` 라인 |

## LaTeX 콘텐츠 생성 규칙

### Education

각 항목은 다음이 된다:

```latex
    \resumeSubheading
    {Institution}{City, State}
    {Degree}{Date Range}
```

수강 과목이 있으면 추가:

```latex
        \resumeItemListStart
            \resumeItem{\textbf{Coursework:} Course1, Course2, ...}
        \resumeItemListEnd
```

### Experience

각 역할은 다음이 된다:

```latex
    \resumeSubheading
      {Company}{Date Range}
      {Role Title}{Location}
      \resumeItemListStart
        \resumeItem{JD 키워드가 주입된 불릿 텍스트}
        ...
      \resumeItemListEnd
```

### Projects

각 프로젝트는 다음이 된다:

```latex
\resumeProjectHeading{Project Name \emph{$|$ Affiliation/Context}}{Date}
\resumeItemListStart
    \resumeItem{Bullet text}
    ...
\resumeItemListEnd
```

### Skills

```latex
    \textbf{Languages}{: C, C++, Java, ...} \\
    \textbf{Frameworks \& ML}{: PyTorch, LangChain, ...} \\
    \textbf{Tools \& Cloud}{: Docker, Kubernetes, ...}
```

## LaTeX 이스케이프 (중요)

모든 텍스트 내용은 삽입 전 반드시 LaTeX용으로 이스케이프해야 한다:

| 문자 | 이스케이프 |
|-----------|--------|
| `&` | `\&` |
| `%` | `\%` |
| `$` | `\$` |
| `#` | `\#` |
| `_` | `\_` |
| `{` | `\{` |
| `}` | `\}` |
| `~` | `\textasciitilde{}` |
| `^` | `\textasciicircum{}` |
| `\` | `\textbackslash{}` |
| `±` | `$\pm$` |
| `→` | `$\rightarrow$` |

**예외:** LaTeX 명령 자체(`\resumeItem`, `\textbf` 등)는 이스케이프하지 않음 — 사용자 제공 텍스트 내용만.

**URL 예외:** `\href{URL}{...}`의 첫 인자 안 텍스트는 이스케이프하지 않음. URL은 원본(또는 RFC 3986 퍼센트 인코딩) 그대로여야 한다. *표시 텍스트*(둘째 인자)만 이스케이프. 예:
```latex
\href{https://example.com/path_with_underscores}{Example\_Display}
```

## ATS 규칙 (pdf 모드와 동일)

- 단일 컬럼 레이아웃 (템플릿이 강제)
- 표준 섹션 헤더: Education, Work Experience, Personal Projects, Technical Skills
- UTF-8, `\pdfgentounicode=1`로 기계 판독 가능
- 키워드 분산: 각 역할의 첫 불릿, 스킬 섹션
- 본문에 이미지/그래픽/색상 없음

## 키워드 주입 전략

`modes/pdf.md`와 동일한 윤리 규칙:
- 후보자에게 없는 역량을 절대 추가하지 않음
- JD 어휘로 기존 경험을 재구성만 함
- 예시:
  - JD가 "RAG pipelines"라 하면 → "LLM workflows with retrieval"을 "RAG pipeline design"으로 재표현
  - JD가 "MLOps"라 하면 → "observability, evals"를 "MLOps and observability"로 재표현

## Overleaf 호환성

생성된 `.tex` 파일은 표준 CTAN 패키지만 사용한다(커스텀/번들 의존성 없음):

- `latexsym`, `fullpage`, `titlesec`, `marvosym`, `color`, `verbatim`, `enumitem`
- `hyperref`, `fancyhdr`, `babel`, `tabularx`, `fontawesome5`, `multicol`, `glyphtounicode`

`.tex` 파일을 Overleaf에 직접 업로드 — 추가 설정 없이 컴파일된다.
