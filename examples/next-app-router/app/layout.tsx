import type { Metadata } from 'next';
import { BlindspotProvider } from '@tindalabs/blindspot-next';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Blindspot — Next.js App Router Example',
};

const blindspotConfig = {
  serviceName: 'blindspot-next-example',
  endpoint: '/v1/traces',
  privacy: { consentRequired: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #1a1a1a; }
          header { background: #0f172a; color: white; padding: 1rem 2rem; display: flex; align-items: center; gap: 2rem; }
          header h1 { font-size: 1.1rem; letter-spacing: 0.05em; }
          nav a { color: #94a3b8; text-decoration: none; padding: 0.4rem 0.8rem; border-radius: 4px; transition: background 0.15s; }
          nav a:hover { background: rgba(255,255,255,0.15); color: white; }
          main { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
          .card { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1rem; }
          button { padding: 0.5rem 1.2rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
          .btn-primary { background: #0ea5e9; color: white; }
          .btn-primary:hover { background: #0284c7; }
          .btn-secondary { background: #e5e7eb; color: #374151; }
          .btn-secondary:hover { background: #d1d5db; }
          input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem; margin-bottom: 0.75rem; }
          .task-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
          .task-item:last-child { border-bottom: none; }
          .badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 12px; background: #ddd; }
          .badge.ok { background: #d1fae5; color: #065f46; }
          .badge.err { background: #fee2e2; color: #991b1b; }
        `}</style>
      </head>
      <body>
        <BlindspotProvider config={blindspotConfig}>
          <Nav />
          <main>{children}</main>
        </BlindspotProvider>
      </body>
    </html>
  );
}
