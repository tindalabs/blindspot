export default function About() {
  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: '0.5rem' }}>About</h2>
        <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
          This example app is instrumented with <strong>@tindalabs/blindspot-next</strong>.
          It records route navigations via <code>BlindspotProvider</code>, user interactions,
          form submissions, fetch calls, and web vitals — all as OpenTelemetry spans, without
          capturing any personally identifiable information.
        </p>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Stack</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li><strong>SDK</strong> → @tindalabs/blindspot-next (this repo)</li>
          <li><strong>Router</strong> → Next.js App Router + BlindspotProvider</li>
          <li><strong>Collector</strong> → OpenTelemetry Collector Contrib (localhost:4318)</li>
          <li><strong>Storage</strong> → Grafana Tempo</li>
          <li><strong>Visualization</strong> → Grafana (localhost:3100)</li>
        </ul>
      </div>
    </>
  );
}
