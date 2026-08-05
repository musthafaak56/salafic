import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import AdminSidebar from '../../components/AdminSidebar'
import PageContainer from '../../components/PageContainer'

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen) {
      const firstLink = document
        .getElementById('admin-sidebar')
        ?.querySelector('nav a')
      firstLink?.focus()
    } else {
      document.getElementById('admin-menu-button')?.focus()
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {menuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      ) : null}

      {menuOpen ? (
        <AdminSidebar
          id="admin-sidebar"
          onNavigate={closeMenu}
          className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-surface shadow-xl animate-slide-in-left md:hidden"
        />
      ) : null}

      <AdminSidebar className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-line bg-surface md:flex" />

      <div className="md:pl-64">
        <AppHeader area="admin" onMenuClick={() => setMenuOpen(true)} menuOpen={menuOpen} />
        <PageContainer>
          <Outlet />
        </PageContainer>
      </div>
    </div>
  )
}
