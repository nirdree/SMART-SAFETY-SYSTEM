import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Safety System — ESP32 Dashboard',
  description: 'Real-time IoT safety monitoring dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-primary grid-overlay">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
            <TopBar />
            <div className="flex-1 p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar() {
  const links = [
    { href: '/dashboard', icon: '⬡', label: 'Dashboard' },
    { href: '/graphs',    icon: '◈', label: 'Graphs' },
    { href: '/alerts',    icon: '◉', label: 'Alerts' },
    { href: '/settings',  icon: '◎', label: 'Settings' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-56 bg-bg-secondary border-r border-bg-border shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-5 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue font-mono text-sm font-bold">
            S²
          </div>
          <span className="hidden lg:block font-display text-sm font-semibold text-slate-200 tracking-widest uppercase">
            SafeGuard
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-6 flex flex-col gap-1 px-2 lg:px-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-accent-blue hover:bg-accent-blue/5 transition-all duration-200 font-mono text-xs"
          >
            <span className="text-lg lg:text-base">{link.icon}</span>
            <span className="hidden lg:block tracking-wider uppercase font-display font-medium text-sm">
              {link.label}
            </span>
          </a>
        ))}
      </nav>

      {/* System Status */}
      <div className="p-3 border-t border-bg-border">
        <div className="hidden lg:flex items-center gap-2 px-2 py-2">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow"></span>
          <span className="text-xs font-mono text-slate-500">ESP32 ONLINE</span>
        </div>
      </div>
    </aside>
  );
}

// ─── TopBar ─────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header className="h-16 bg-bg-secondary border-b border-bg-border flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Mobile nav */}
      <div className="flex md:hidden items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue font-mono text-sm font-bold">
          S²
        </div>
        <nav className="flex items-center gap-4">
          {[
            { href: '/dashboard', label: 'Dash' },
            { href: '/graphs', label: 'Graphs' },
            { href: '/alerts', label: 'Alerts' },
            { href: '/settings', label: 'Settings' },
          ].map((l) => (
            <a key={l.href} href={l.href} className="text-xs font-mono text-slate-400 hover:text-accent-blue transition-colors uppercase tracking-wider">
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Title */}
      <div className="hidden md:flex items-center gap-2">
        <span className="font-display text-lg font-semibold text-slate-200 tracking-wide">
          SMART SAFETY SYSTEM
        </span>
        <span className="font-mono text-xs text-accent-blue/60 border border-accent-blue/20 px-2 py-0.5 rounded">
          ESP32
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <div className="font-mono text-xs text-slate-500" id="live-clock">
          {/* Filled by client */}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></span>
          <span className="font-mono text-xs text-accent-green">LIVE</span>
        </div>
      </div>
    </header>
  );
}
