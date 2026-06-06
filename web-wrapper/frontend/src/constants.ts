import { ClipboardList, FileText, Search, Sparkles, Table2 } from 'lucide-react';
import type { CareerCommand, TabConfig } from './types';

export const tabs: TabConfig[] = [
  { id: 'evaluate', label: '적합도 분석', icon: Sparkles },
  { id: 'scan', label: '공고 탐색', icon: Search },
  { id: 'pipeline', label: '인박스', icon: ClipboardList },
  { id: 'tracker', label: '트래커', icon: Table2 },
  { id: 'pdf', label: 'CV PDF', icon: FileText },
];

// export const modeOptions = [
//   'auto',
//   'oferta',
//   'ofertas',
//   'contacto',
//   'deep',
//   'interview-prep',
//   'pdf',
//   'training',
//   'project',
//   'tracker',
//   'pipeline',
//   'apply',
//   'scan',
//   'batch',
//   'patterns',
//   'followup',
// ];
export const modeOptions = [
  { value: 'auto', label: '자동 (Auto)' },
  { value: 'oferta', label: '공고 평가' },
  { value: 'ofertas', label: '공고 비교' },
  { value: 'contacto', label: '네트워킹' },
  { value: 'deep', label: '심층 리서치' },
  { value: 'interview-prep', label: '면접 준비' },
  { value: 'pdf', label: 'CV PDF' },
  { value: 'training', label: '교육 평가' },
  { value: 'project', label: '프로젝트 평가' },
  { value: 'tracker', label: '트래커' },
  { value: 'pipeline', label: '파이프라인' },
  { value: 'apply', label: '지원서 작성' },
  { value: 'scan', label: '포털 스캔' },
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
