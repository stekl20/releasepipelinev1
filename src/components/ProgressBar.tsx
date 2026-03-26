interface ProgressBarProps {
  count: number;
  target: number;
}

export function ProgressBar({ count, target }: ProgressBarProps) {
  const filled = Math.min(count, target);
  const bar = '█'.repeat(filled) + '░'.repeat(target - filled);

  const color =
    count === target
      ? 'var(--green)'
      : count < target
      ? 'var(--amber)'
      : 'var(--green)'; // >target is fine, treat as green

  return (
    <span style={{ color, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      {bar}{'  '}{count}/{target}
    </span>
  );
}
