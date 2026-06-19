import type React from 'react';

export type Page = 'landing' | 'workspace' | 'offer' | 'discover' | 'api' | 'result' | 'setup' | 'account' | 'login' | 'signup' | 'terms' | 'privacy' | 'refund' | 'pricing';

export type Tab = 'evaluate' | 'scan' | 'pipeline' | 'tracker' | 'pdf';

export type CommandResult = {
  ok: boolean;
  command?: string[];
  cwd?: string;
  returncode?: number;
  stdout?: string;
  stderr?: string;
  mode?: string;
  onboarding?: Record<string, boolean>;
  streaming?: boolean;
  activity?: string; // 스트리밍 중 현재 도구 활동(예: "🔍 웹 검색 중…"). done 시 비움.
};

export type RunMeta = {
  id: number;
  mode: string;
  title: string;
  ok: boolean;
  created_at: string;
};

export type RunDetail = RunMeta & {
  input: string;
  stdout: string;
};

export type TrackerRow = {
  index: string;
  date: string;
  company: string;
  role: string;
  score: string;
  status: string;
  pdf: string;
  report: string;
};

export type PipelineItem = {
  checked: boolean;
  url: string;
  company: string;
  title: string;
  raw: string;
};

export type Health = {
  ok: boolean;
  career_ops_root?: string;
  onboarding?: Record<string, boolean>;
  error?: string;
  user?: User | null;
};

export type User = {
  id: number;
  email: string;
  plan?: string;
};

export type SetupData = {
  cv_md: string;
  profile_yml: string;
  mode_profile_md: string;
  portals_yml: string;
  updated_at?: string;
  onboarding: Record<string, boolean>;
};

export type CareerCommand = {
  command: string;
  mode: string;
  description: string;
};

export type TabConfig = {
  id: Tab;
  label: string;
  icon: React.ElementType;
};
