import { useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Passcode } from './components/Passcode';
import { Nav } from './components/Nav';
import { CsvUpload } from './components/CsvUpload';
import { QuickEntry } from './components/QuickEntry';
import { EditRelease } from './components/EditRelease';
import { Pipeline } from './views/Pipeline';
import { Weeks } from './views/Weeks';
import { Artists } from './views/Artists';
import { useReleases } from './hooks/useReleases';
import { useTheme } from './hooks/useTheme';
import { parseCsv } from './hooks/useCsvImport';
import type { Release } from './types';

function ImportBanner({ count, weeks, onDismiss }: { count: number; weeks: number; onDismiss: () => void }) {
  return (
    <div style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 24px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--green)' }}>loaded {count} releases across {weeks} weeks.</span>
      <button onClick={onDismiss} style={{ color: 'var(--dim)', fontSize: 13 }}>[dismiss]</button>
    </div>
  );
}

function UndoToast({ release, onUndo, onDismiss }: { release: Release; onUndo: () => void; onDismiss: () => void }) {
  return (
    <div style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 24px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--dim)' }}>deleted <span style={{ color: 'var(--text)' }}>{release.act} — {release.title}</span></span>
      <div style={{ display: 'flex', gap: 16 }}>
        <button onClick={onUndo} style={{ color: 'var(--amber)', fontSize: 13 }}>[undo]</button>
        <button onClick={onDismiss} style={{ color: 'var(--dim)', fontSize: 13 }}>[dismiss]</button>
      </div>
    </div>
  );
}

function AppInner() {
  const { releases, loading, setReleases, toggleApproved, toggleDistributed, deleteRelease, restoreRelease, updateRelease } = useReleases();
  const { theme, toggleTheme } = useTheme();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerData, setBannerData] = useState({ count: 0, weeks: 0 });
  const [importError, setImportError] = useState<string | null>(null);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [undoRelease, setUndoRelease] = useState<Release | null>(null);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport(newReleases: Release[]) {
    try {
      await setReleases(newReleases);
      const weeks = new Set(newReleases.map(r => r.date)).size;
      setBannerData({ count: newReleases.length, weeks });
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    } catch {
      setImportError('failed to save to database. check your connection.');
    }
  }

  function handleReimportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const result = parseCsv(text, releases ?? []);
      if (result.error) {
        setImportError(result.error);
      } else {
        setImportError(null);
        handleImport(result.releases);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleDelete(id: string) {
    const release = releases?.find(r => r.id === id);
    if (!release) return;
    await deleteRelease(id);
    // Show undo toast for 5 seconds
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoRelease(release);
    undoTimer.current = setTimeout(() => setUndoRelease(null), 5000);
  }

  async function handleSaveEdit(oldId: string, updated: Release) {
    setEditingRelease(null);
    await updateRelease(oldId, updated);
  }

  async function handleUndo() {
    if (!undoRelease) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoRelease(null);
    await restoreRelease(undoRelease);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 14 }}>
        loading...
      </div>
    );
  }

  if (!releases || releases.length === 0) {
    return <CsvUpload existingReleases={[]} onImport={handleImport} />;
  }

  return (
    <>
      <Nav hasData={true} onReimport={() => fileRef.current?.click()} onQuickEntry={() => setShowQuickEntry(true)} theme={theme} onToggleTheme={toggleTheme} />
      <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleReimportFile} />
      {showBanner && <ImportBanner count={bannerData.count} weeks={bannerData.weeks} onDismiss={() => setShowBanner(false)} />}
      {importError && (
        <div style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 24px', fontSize: 13, color: 'var(--red)' }}>
          error: {importError}
          <button onClick={() => setImportError(null)} style={{ marginLeft: 12, color: 'var(--dim)' }}>[dismiss]</button>
        </div>
      )}
      {undoRelease && <UndoToast release={undoRelease} onUndo={handleUndo} onDismiss={() => setUndoRelease(null)} />}
      {editingRelease && <EditRelease release={editingRelease} onSave={handleSaveEdit} onClose={() => setEditingRelease(null)} />}
      {showQuickEntry && (
        <QuickEntry
          existingReleases={releases}
          onAdd={merged => { handleImport(merged); setShowQuickEntry(false); }}
          onClose={() => setShowQuickEntry(false)}
        />
      )}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Pipeline releases={releases} onToggleApproved={toggleApproved} onToggleDistributed={toggleDistributed} onDelete={handleDelete} onEdit={setEditingRelease} />} />
          <Route path="/weeks" element={<Weeks releases={releases} onToggleApproved={toggleApproved} onToggleDistributed={toggleDistributed} onDelete={handleDelete} onEdit={setEditingRelease} />} />
          <Route path="/artists" element={<Artists releases={releases} onToggleApproved={toggleApproved} onToggleDistributed={toggleDistributed} onDelete={handleDelete} onEdit={setEditingRelease} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(
    !import.meta.env.VITE_PASSCODE || sessionStorage.getItem('auth') === '1'
  );

  if (!unlocked) return <Passcode onUnlock={() => setUnlocked(true)} />;

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
