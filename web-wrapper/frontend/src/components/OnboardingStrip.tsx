import { CheckCircle2 } from 'lucide-react';
import type { Health } from '../types';
import { cx } from './cx';

export function OnboardingStrip({ health }: { health?: Health }) {
  const checks = health?.onboarding || {};
  const items = [
    ['CV', checks.cv],
    ['Profile', checks.profile],
    ['Modes', checks.mode_profile],
    ['Portals', checks.portals],
  ];

  return (
    <div className="setup-strip">
      {items.map(([label, done]) => (
        <span key={label as string} className={cx('setup-item', done ? 'ready' : 'missing')}>
          <CheckCircle2 size={15} />
          {label}
        </span>
      ))}
    </div>
  );
}
