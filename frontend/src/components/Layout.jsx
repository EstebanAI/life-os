import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { to: '/',               label: 'Dashboard',  icon: '◈' },
  { to: '/today',          label: 'Hoy',        icon: '◐' },
  { to: '/checkin',        label: 'Check-in',   icon: '✦' },
  { to: '/habits-config',  label: 'Hábitos',    icon: '≡' },
  { to: '/history',        label: 'Historial',  icon: '◎' },
  { to: '/quarterly',      label: 'Trimestral', icon: '◉' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-surface shrink-0">
        <div className="p-6 border-b border-border">
          <h1 className="text-lg font-semibold text-text-primary tracking-tight">Amón</h1>
          <p className="text-xs text-text-muted mt-0.5">{user?.username}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/20 text-accent-light font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-card'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <a
            href="/api/export/csv"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-card transition-colors w-full"
          >
            <span>↓</span> Exportar CSV
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-danger hover:bg-card transition-colors w-full mt-0.5"
          >
            <span>→</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-text-primary">Amón</h1>
        <button
          onClick={() => document.getElementById('mobile-nav').classList.toggle('hidden')}
          className="text-text-secondary p-1"
        >
          ☰
        </button>
      </div>

      {/* Mobile nav dropdown */}
      <div id="mobile-nav" className="hidden md:hidden fixed top-12 left-0 right-0 z-40 bg-surface border-b border-border p-3 space-y-1">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => document.getElementById('mobile-nav').classList.add('hidden')}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-accent/20 text-accent-light font-medium' : 'text-text-secondary'
              }`
            }
          >
            <span>{icon}</span>{label}
          </NavLink>
        ))}
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-danger w-full">
          <span>→</span> Cerrar sesión
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
