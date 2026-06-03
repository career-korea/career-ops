import { ClipboardList, FileText, Search, Sparkles, Table2 } from 'lucide-react';
import type { CareerCommand, TabConfig } from './types';

export const tabs: TabConfig[] = [
  { id: 'evaluate', label: 'Offer Fit', icon: Sparkles },
  { id: 'scan', label: 'Discover', icon: Search },
  { id: 'pipeline', label: 'Inbox', icon: ClipboardList },
  { id: 'tracker', label: 'Tracker', icon: Table2 },
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
  { command: '/career-ops {JD}', mode: 'auto-pipeline', description: 'AUTO-PIPELINE: evaluate + report + PDF + tracker' },
  { command: '/career-ops pipeline', mode: 'pipeline', description: 'Process pending URLs from inbox' },
  { command: '/career-ops oferta', mode: 'oferta', description: 'Evaluation only A-G' },
  { command: '/career-ops ofertas', mode: 'ofertas', description: 'Compare and rank multiple offers' },
  { command: '/career-ops contacto', mode: 'contacto', description: 'LinkedIn power move: find contacts + draft message' },
  { command: '/career-ops deep', mode: 'deep', description: 'Deep research prompt about company' },
  { command: '/career-ops interview-prep', mode: 'interview-prep', description: 'Generate company-specific interview prep doc' },
  { command: '/career-ops pdf', mode: 'pdf', description: 'PDF only, ATS-optimized CV' },
  { command: '/career-ops training', mode: 'training', description: 'Evaluate course/cert against North Star' },
  { command: '/career-ops project', mode: 'project', description: 'Evaluate portfolio project idea' },
  { command: '/career-ops tracker', mode: 'tracker', description: 'Application status overview' },
  { command: '/career-ops apply', mode: 'apply', description: 'Live application assistant' },
  { command: '/career-ops scan', mode: 'scan', description: 'Scan portals and discover new offers' },
  { command: '/career-ops batch', mode: 'batch', description: 'Batch processing with parallel workers' },
  { command: '/career-ops patterns', mode: 'patterns', description: 'Analyze rejection patterns and improve targeting' },
  { command: '/career-ops followup', mode: 'followup', description: 'Follow-up cadence tracker: flag overdue, generate drafts' },
];
