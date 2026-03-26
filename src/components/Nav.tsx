import { NavLink } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';

interface NavProps {
  hasData: boolean;
  onReimport: () => void;
  onQuickEntry: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function Nav({ hasData, onReimport, onQuickEntry, theme, onToggleTheme }: NavProps) {
  const isMobile = useIsMobile();

  return (
    <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '10px 16px' : '12px 24px' }}>
        {/* Top row: title + theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700 }}>release-tracker/</span>
            {hasData && !isMobile && (
              <>
                <button onClick={onQuickEntry} style={{ fontSize: 13, color: 'var(--dim)' }}>[+ add]</button>
                <button onClick={onReimport} style={{ fontSize: 13, color: 'var(--dim)' }}>[import csv]</button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {hasData && !isMobile && ['/', '/weeks', '/artists'].map((path, i) => {
              const label = ['schedule', 'weeks', 'artists'][i];
              return (
                <NavLink key={path} to={path} end={path === '/'}
                  style={({ isActive }) => ({ fontSize: 14, color: isActive ? 'var(--accent)' : 'var(--dim)', fontWeight: isActive ? 700 : 400 })}>
                  {({ isActive }) => isActive ? `> ${label}` : label}
                </NavLink>
              );
            })}
            <button onClick={onToggleTheme} style={{ fontSize: 13, color: 'var(--dim)' }}>
              {theme === 'dark' ? '[light]' : '[dark]'}
            </button>
          </div>
        </div>

        {/* Mobile bottom row: nav links + actions */}
        {isMobile && hasData && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              {['/', '/weeks', '/artists'].map((path, i) => {
                const label = ['schedule', 'weeks', 'artists'][i];
                return (
                  <NavLink key={path} to={path} end={path === '/'}
                    style={({ isActive }) => ({ fontSize: 14, color: isActive ? 'var(--text)' : 'var(--dim)', fontWeight: isActive ? 700 : 400 })}>
                    {({ isActive }) => isActive ? `> ${label}` : label}
                  </NavLink>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onQuickEntry} style={{ fontSize: 13, color: 'var(--dim)' }}>[+ add]</button>
              <button onClick={onReimport} style={{ fontSize: 13, color: 'var(--dim)' }}>[csv]</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
