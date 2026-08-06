import { Link } from 'react-router-dom'
import Card from './Card'
import ThemeToggle from './ThemeToggle'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-lg font-bold tracking-tight text-ink">
          Salafi Center <span className="text-ink-secondary">Cherukunnu</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mb-6 text-sm text-ink-secondary">{subtitle}</p>
          ) : null}
          <Card className="p-6 sm:p-8">{children}</Card>
          {footer ? (
            <p className="mt-6 text-center text-sm text-ink-secondary">{footer}</p>
          ) : null}
        </div>
      </main>
    </div>
  )
}
