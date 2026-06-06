import { ClipboardList, FileText, Search, Sparkles, Table2 } from 'lucide-react';
import type { CareerCommand, TabConfig } from './types';

export const tabs: TabConfig[] = [
  { id: 'evaluate', label: '적합도 분석', icon: Sparkles },
  { id: 'scan', label: '공고 탐색', icon: Search },
  { id: 'pipeline', label: '인박스', icon: ClipboardList },
  { id: 'tracker', label: '트래커', icon: Table2 },
  { id: 'pdf', label: 'CV PDF', icon: FileText },
];

// value = 백엔드 SDK가 해석하는 모델 별칭. '' = 서버 기본값.
// haiku는 토큰/비용이 가장 저렴, opus는 품질 우선.
export const modelOptions: { value: string; label: string }[] = [
  { value: '', label: '기본 모델' },
  { value: 'haiku', label: 'Haiku (빠르고 저렴)' },
  { value: 'sonnet', label: 'Sonnet (균형)' },
  { value: 'opus', label: 'Opus (최고 품질)' },
];

// value = 백엔드 모드 키(변경 금지), label = 화면 표시용 한국어.
export const modeOptions: { value: string; label: string }[] = [
  { value: 'auto', label: '자동 감지' },
  { value: 'oferta', label: '채용공고 평가 (A-G)' },
  { value: 'ofertas', label: '여러 공고 비교' },
  { value: 'contacto', label: 'LinkedIn 아웃리치' },
  { value: 'deep', label: '기업 심층 리서치' },
  { value: 'interview-prep', label: '면접 준비' },
  { value: 'pdf', label: 'CV PDF 생성' },
  { value: 'training', label: '교육/자격증 평가' },
  { value: 'project', label: '프로젝트 평가' },
  { value: 'tracker', label: '지원 현황' },
  { value: 'pipeline', label: '인박스 처리' },
  { value: 'apply', label: '지원서 작성' },
  { value: 'scan', label: '공고 스캔' },
  { value: 'batch', label: '배치 평가' },
  { value: 'patterns', label: '패턴 분석' },
  { value: 'followup', label: '후속 연락' },
];

export const careerCommands: CareerCommand[] = [
  { command: '/career-ops {JD}', mode: 'auto-pipeline', description: '자동 파이프라인: 평가, 보고서, PDF, 트래커 기록' },
  { command: '/career-ops pipeline', mode: 'pipeline', description: '인박스의 대기 URL을 순서대로 처리' },
  { command: '/career-ops oferta', mode: 'oferta', description: '채용공고 A-G 단독 평가' },
  { command: '/career-ops ofertas', mode: 'ofertas', description: '여러 공고 비교 및 지원 우선순위 산정' },
  { command: '/career-ops contacto', mode: 'contacto', description: 'LinkedIn/네트워킹 대상 찾기와 메시지 초안' },
  { command: '/career-ops deep', mode: 'deep', description: '회사 심층 리서치' },
  { command: '/career-ops interview-prep', mode: 'interview-prep', description: '회사별 면접 준비 문서 생성' },
  { command: '/career-ops pdf', mode: 'pdf', description: 'ATS 최적화 CV PDF 생성' },
  { command: '/career-ops training', mode: 'training', description: '교육/자격증의 목표 역할 대비 가치 평가' },
  { command: '/career-ops project', mode: 'project', description: '포트폴리오 프로젝트 아이디어 평가' },
  { command: '/career-ops tracker', mode: 'tracker', description: '지원 현황과 파이프라인 요약' },
  { command: '/career-ops apply', mode: 'apply', description: '지원서 문항 답변 초안 작성' },
  { command: '/career-ops scan', mode: 'scan', description: '한국/글로벌 리모트 포털 스캔' },
  { command: '/career-ops batch', mode: 'batch', description: '여러 공고 병렬 배치 평가' },
  { command: '/career-ops patterns', mode: 'patterns', description: '탈락/전환 패턴 분석과 타겟팅 개선' },
  { command: '/career-ops followup', mode: 'followup', description: '후속 연락 케이던스 확인과 초안 생성' },
];
