'use client';
import { useState } from 'react';
import { recordEvent, getRouteSpan } from '@tindalabs/blindspot';

export default function Home() {
  function setAttribute(key: string, value: string) {
    getRouteSpan()?.setAttribute(key, value);
  }
  const [status, setStatus] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      const data = await res.json();
      recordEvent('demo.fetch_complete', { 'demo.todo_id': String(data.id) });
      setAttribute('demo.last_todo_title', data.title);
      setStatus({ text: `Fetched todo: "${data.title}"`, kind: 'ok' });
    } catch {
      setStatus({ text: 'fetch failed', kind: 'err' });
    } finally {
      setLoading(false);
    }
  }

  function handleError() {
    setTimeout(() => {
      throw new Error('Demo unhandled error — check the error span in Grafana');
    }, 0);
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: '0.5rem' }}>Welcome to the Next.js demo app</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
          Every click, navigation, form submission and fetch call below generates an
          OpenTelemetry span. Open{' '}
          <a href="http://localhost:3100" target="_blank" rel="noreferrer">Grafana</a> to see them.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleFetch} disabled={loading} data-blindspot-label="fetch-task-data">
            {loading ? 'Fetching…' : 'Fetch task data'}
          </button>
          <button className="btn-secondary" onClick={handleError} data-blindspot-label="trigger-error">Trigger JS error</button>
        </div>
        {status && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <span className={`badge ${status.kind}`}>{status.kind === 'ok' ? '200 OK' : 'Error'}</span>{' '}
            {status.text}
          </p>
        )}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Try navigating</h3>
        <p style={{ color: '#94a3b8' }}>
          Use the nav links above to move between pages. Each navigation creates a new root
          span in your trace, instrumented by <code>BlindspotProvider</code>.
        </p>
      </div>
    </>
  );
}
