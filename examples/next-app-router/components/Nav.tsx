'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <header>
      <h1>Blindspot</h1>
      <nav>
        <Link
          href="/"
          data-blindspot-label="nav-home"
          style={isActive('/') ? { background: 'rgba(255,255,255,0.08)', color: 'white' } : {}}
        >
          Home
        </Link>
        <Link
          href="/tasks"
          data-blindspot-label="nav-tasks"
          style={isActive('/tasks') ? { background: 'rgba(255,255,255,0.08)', color: 'white' } : {}}
        >
          Tasks
        </Link>
        <Link
          href="/about"
          data-blindspot-label="nav-about"
          style={isActive('/about') ? { background: 'rgba(255,255,255,0.08)', color: 'white' } : {}}
        >
          About
        </Link>
      </nav>
    </header>
  );
}
