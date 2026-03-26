import { useRef, useState, type DragEvent } from 'react';
import { parseCsv } from '../hooks/useCsvImport';
import type { Release } from '../types';

interface CsvUploadProps {
  existingReleases: Release[] | null;
  onImport: (releases: Release[]) => void;
  inline?: boolean;
}

export function CsvUpload({ existingReleases, onImport, inline = false }: CsvUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const result = parseCsv(text, existingReleases ?? []);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        onImport(result.releases);
      }
    };
    reader.readAsText(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  if (inline) {
    return (
      <>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <button onClick={() => fileRef.current?.click()}>
          [re-import]
        </button>
        {error && (
          <span style={{ color: 'var(--red)', fontSize: 13, marginLeft: 12 }}>
            error: {error}
          </span>
        )}
      </>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}
    >
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 32 }}>
          release-tracker/
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `1px solid ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            padding: '32px 24px',
            cursor: 'pointer',
            backgroundColor: 'var(--surface)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--dim)', marginBottom: 8 }}>no data loaded.</div>
          <div style={{ marginBottom: 16 }}>
            drop a csv file here, or click to browse.
          </div>
          <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 24 }}>
            expected columns: Act, Title, Release Date, Distributed
          </div>
          <button
            style={{
              border: '1px solid var(--border)',
              padding: '8px 16px',
              fontSize: 14,
              color: 'var(--text)',
              pointerEvents: 'none',
            }}
          >
            [ upload csv ]
          </button>
        </div>
        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>
            error: {error}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
