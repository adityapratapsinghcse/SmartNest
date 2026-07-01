import { NavLink } from 'react-router-dom'
import { useAlerts } from '../context/AlertsContext'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/security', label: 'Security' },
  { to: '/climate', label: 'Climate' },
  { to: '/safety', label: 'Safety' },
  { to: '/energy', label: 'Energy' },
  { to: '/alerts', label: 'Alerts' },
]

function Navbar() {
  const { unreadCount, isConnected } = useAlerts()

  return (
    <header className="border-b border-panel-border bg-panel">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-semibold text-ink">SmartNest</span>
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-safe shadow-[0_0_8px] shadow-safe' : 'bg-danger'
            }`}
            title={isConnected ? 'Live connection active' : 'Disconnected'}
          ></span>
        </div>
        <nav className="flex gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `font-mono text-xs tracking-wide px-3 py-2 rounded-md transition-colors flex items-center ${
                  isActive
                    ? 'bg-deep text-accent border border-panel-border'
                    : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {link.label.toUpperCase()}
              {link.to === '/alerts' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-danger text-[9px] text-ink">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Navbar