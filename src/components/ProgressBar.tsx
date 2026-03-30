interface ProgressBarProps {
  count: number;
  target: number;
}

export function ProgressBar({ count, target }: ProgressBarProps) {
  const pct = Math.min(count / target, 1) * 100;
  const color = count >= target ? 'var(--green)' : 'var(--amber)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-block', width: 56, height: 12, backgroundColor: 'var(--border-strong, var(--border))', position: 'relative', verticalAlign: 'middle' }}>
        <span style={{ display: 'block', width: `${pct}%`, height: '100%', backgroundColor: color }} />
      </span>
      <span style={{ color, fontSize: 13 }}>{count}/{target}</span>
    </span>
  );
}
