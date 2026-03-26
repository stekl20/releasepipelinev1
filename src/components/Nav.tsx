import { NavLink } from 'react-router-dom';

interface NavProps {
  hasData: boolean;
  onReimport: () => void;
  onQuickEntry: () => void;
}

export function Nav({ hasData, onReimport, onQuickEntry }: NavProps) {
  return (
    <nav
      style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        className="content-width"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          maxWidth: 960,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            release-tracker/
          </span>
          {hasData && (
            <>
              <button onClick={onQuickEntry} style={{ fontSize: 13, color: 'var(--dim)' }}>
                [+ add]
              </button>
              <button onClick={onReimport} style={{ fontSize: 13, color: 'var(--dim)' }}>
                [re-import]
              </button>
            </>
          )}
        </div>
        {hasData && (
          <div style={{ display: 'flex', gap: 24 }}>
            {['/', '/weeks', '/artists'].map((path, i) => {
              const label = ['pipeline', 'weeks', 'artists'][i];
              return (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  style={({ isActive }) => ({
                    fontSize: 14,
                    color: isActive ? 'var(--accent)' : 'var(--dim)',
                    fontWeight: isActive ? 700 : 400,
                  })}
                >
                  {({ isActive }) => (isActive ? `> ${label}` : label)}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
