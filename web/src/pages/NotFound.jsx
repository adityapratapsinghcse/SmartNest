import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="border border-panel-border bg-panel rounded-md px-6 py-16 text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-2">ERROR 404</p>
      <h1 className="font-display text-2xl text-ink mb-4">Page not found</h1>
      <Link to="/" className="font-mono text-xs tracking-[0.2em] text-accent hover:underline">
        RETURN TO DASHBOARD
      </Link>
    </div>
  )
}

export default NotFound