import { createContext, useContext, useEffect, useState } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'

const Context = createContext(null)
export const useCenter = () => useContext(Context)

export default function CenterRoute() {
  const { slug } = useParams()
  const { user, profile } = useAuth()
  const [state, setState] = useState({ slug: '', loading: true })
  useEffect(() => {
    let active = true,
      unsubscribe = () => {}
    setState({ slug, loading: true })
    async function load() {
      try {
        const mapping = await getDoc(doc(db, 'centerSlugs', slug))
        if (!active) return
        if (!mapping.exists())
          throw new Error('This center could not be found.')
        const id = mapping.data().centerId
        unsubscribe = onSnapshot(
          doc(db, 'masjids', id),
          (snap) => {
            if (!active) return
            if (!snap.exists()) {
              setState({ slug, error: 'This center is unavailable.' })
              return
            }
            const center = { ...snap.data(), id }
            setState({ slug, center })
            document.title = `${center.displayName} — Salafic`
            // Only published, public configuration may be used as an offline fallback.
            if (center.status === 'published')
              try {
                localStorage.setItem(
                  `center:${slug}`,
                  JSON.stringify({ center, savedAt: Date.now() }),
                )
              } catch {}
          },
          (error) => {
            if (!active) return
            if (!navigator.onLine) {
              try {
                const cached = JSON.parse(
                  localStorage.getItem(`center:${slug}`),
                )
                if (
                  cached?.center?.slug === slug &&
                  Date.now() - cached.savedAt < 7 * 86400000
                ) {
                  setState({ slug, center: cached.center, offline: true })
                  return
                }
              } catch {}
            }
            try {
              localStorage.removeItem(`center:${slug}`)
            } catch {}
            setState({
              slug,
              error:
                error.code === 'permission-denied'
                  ? 'This center is not published or you do not have access.'
                  : 'Unable to load this center. Please try again.',
            })
          },
        )
      } catch (error) {
        if (!active) return
        if (!navigator.onLine)
          try {
            const cached = JSON.parse(localStorage.getItem(`center:${slug}`))
            if (
              cached?.center?.slug === slug &&
              Date.now() - cached.savedAt < 7 * 86400000
            ) {
              setState({ slug, center: cached.center, offline: true })
              return
            }
          } catch {}
        setState({ slug, error: error.message })
      }
    }
    load()
    return () => {
      active = false
      unsubscribe()
    }
  }, [slug, user?.uid, profile?.role])
  if (state.slug !== slug || state.loading)
    return (
      <main className="platform-page">
        <p role="status">Loading center…</p>
      </main>
    )
  if (!state.center)
    return (
      <main className="platform-page">
        <h1>Center unavailable</h1>
        <p role="alert">{state.error}</p>
        <Link to="/centers">Find a center</Link>
      </main>
    )
  return (
    <Context.Provider
      value={{
        center: state.center,
        centerId: state.center.id,
        base: `/c/${slug}`,
        offline: state.offline,
      }}
    >
      <Outlet key={state.center.id} />
    </Context.Provider>
  )
}
