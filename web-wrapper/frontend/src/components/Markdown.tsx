import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 모든 에이전트 출력이 마크다운은 아니다. scan/PDF 로그, discovery 도움말(ASCII 정렬),
// 평문 응답은 마크다운으로 렌더링하면 공백/정렬이 깨진다. 강한 마크다운 신호가 있을 때만
// 마크다운으로 렌더링하고, 그 외에는 호출부에서 평문(<pre>)으로 그린다.
const MARKDOWN_SIGNALS: RegExp[] = [
  /^#{1,6}\s/m, // 제목
  /^\s*[-*]\s+\S/m, // 글머리표 리스트
  /^\s*\d+\.\s+\S/m, // 번호 리스트
  /\*\*[^*]+\*\*/, // 굵게
  /^\s*\|.+\|\s*$/m, // 표 행
  /^\s*(-{3,}|\*{3,}|_{3,})\s*$/m, // 구분선
  /\[[^\]]+\]\([^)]+\)/, // 링크
];

export function looksLikeMarkdown(text: string | undefined): boolean {
  if (!text) return false;
  return MARKDOWN_SIGNALS.some((re) => re.test(text));
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
