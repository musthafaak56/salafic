import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { act } from '../lib/platform'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessError, setAccessError] = useState('')
  const generation = useRef(0)
  async function refreshAccess(firebaseUser = auth.currentUser) {
    const current = ++generation.current
    if (!firebaseUser) {
      setProfile(null)
      setLoading(false)
      return null
    }
    setAccessError('')
    try {
      const session = await act('session')
      const next = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email,
        ...session,
      }
      if (current === generation.current) setProfile(next)
      return next
    } catch {
      if (current === generation.current) {
        setProfile({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          role: 'user',
          centers: [],
          invitations: [],
        })
        setAccessError(
          'Management access could not be loaded. Check the connection and retry.',
        )
      }
      return { role: 'user' }
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }
  useEffect(
    () =>
      onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser)
        setLoading(true)
        refreshAccess(firebaseUser)
      }),
    [],
  )
  async function loginWithGoogle() {
    const credential = await signInWithPopup(auth, googleProvider)
    setUser(credential.user)
    return refreshAccess(credential.user)
  }
  async function logout() {
    await signOut(auth)
    ++generation.current
    setUser(null)
    setProfile(null)
    setLoading(false)
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        accessError,
        refreshAccess,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
