import type React from 'react';

export type Page = 'workspace' | 'api';

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
