import { ClipboardList, FileText, Search, Sparkles, Table2 } from 'lucide-react';
import type { CareerCommand, TabConfig } from './types';

export const tabs: TabConfig[] = [
  { id: 'evaluate', label: '적합도 분석', icon: Sparkles },
  { id: 'scan', label: '공고 탐색', icon: Search },
  { id: 'pipeline', label: '인박스', icon: ClipboardList },
  { id: 'tracker', label: '트래커', icon: Table2 },
  { id: 'pdf', label: 'CV PDF', icon: FileText },
];

export const modeOptions = [
  'auto',
  'oferta',
  'ofertas',
  'contacto',
  'deep',
  'interview-prep',
  'pdf',
  'training',
  'project',
  'tracker',
  'pipeline',
  'apply',
  'scan',
  'batch',
  'patterns',
  'followup',
];

export const careerCommands: CareerCommand[] = [
  { command: '/career-ops {JD}', mode: 'auto-pipeline', description: '자동 파이프라인: 평가 + 리포트 + PDF + 트래커' },
  { command: '/career-ops pipeline', mode: 'pipeline', description: '인박스의 대기 중인 URL 일괄 처리' },
  { command: '/career-ops oferta', mode: 'oferta', description: 'A-G 기준 단독 평가' },
  { command: '/career-ops ofertas', mode: 'ofertas', description: '복수 공고 비교 및 순위 산정' },
  { command: '/career-ops contacto', mode: 'contacto', description: 'LinkedIn 인맥 발굴 + 메시지 초안 작성' },
  { command: '/career-ops deep', mode: 'deep', description: '회사 심층 리서치' },
  { command: '/career-ops interview-prep', mode: 'interview-prep', description: '회사별 면접 준비 문서 생성' },
  { command: '/career-ops pdf', mode: 'pdf', description: 'ATS 최적화 CV PDF 단독 생성' },
  { command: '/career-ops training', mode: 'training', description: '코스/자격증 목표 대비 평가' },
  { command: '/career-ops project', mode: 'project', description: '포트폴리오 프로젝트 아이디어 평가' },
  { command: '/career-ops tracker', mode: 'tracker', description: '지원 현황 개요' },
  { command: '/career-ops apply', mode: 'apply', description: '실시간 지원서 작성 어시스턴트' },
  { command: '/career-ops scan', mode: 'scan', description: '포털 스캔 및 새 공고 발굴' },
  { command: '/career-ops batch', mode: 'batch', description: '병렬 워커 배치 처리' },
  { command: '/career-ops patterns', mode: 'patterns', description: '서류 탈락 패턴 분석 및 타겟팅 개선' },
  { command: '/career-ops followup', mode: 'followup', description: '후속 연락 케이던스 트래커: 지연 플래그 + 초안 생성' },
];
