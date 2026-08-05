import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'

const MOCK_AUTH = true
const MOCK_ROLE_KEY = 'salafic-mock-role'

const AuthContext = createContext(null)

const MOCK_USER = {
  uid: 'mock-user',
  email: (role) => `${role}@salafic.dev`,
  displayName: (role) => `Mock ${role[0].toUpperCase() + role.slice(1)}`,
}

function initialMockRole() {
  try {
    return localStorage.getItem(MOCK_ROLE_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  function mockUser(role, uid) {
    return {
      uid,
      email: MOCK_USER.email(role),
      displayName: MOCK_USER.displayName(role),
    }
  }

  function mockProfile(role, uid) {
    return {
      uid,
      name: MOCK_USER.displayName(role),
      email: MOCK_USER.email(role),
      role,
      masjidIds: role === 'user' ? [] : ['main'],
      createdAt: new Date().toISOString(),
    }
  }

  async function syncMockProfile(profileData) {
    try {
      await setDoc(doc(db, 'users', profileData.uid), profileData)
    } catch {
      // Firestore may be unreachable in mock mode; auth still works.
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const savedRole = initialMockRole() || 'user'
        try {
          const docRef = doc(db, 'users', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            setProfile(docSnap.data())
            setUser(mockUser(docSnap.data().role || savedRole, firebaseUser.uid))
          } else {
            const data = mockProfile(savedRole, firebaseUser.uid)
            setProfile(data)
            setUser(mockUser(savedRole, firebaseUser.uid))
            await syncMockProfile(data)
          }
        } catch {
          setProfile({ role: savedRole })
          setUser(mockUser(savedRole, firebaseUser.uid))
        }
      } else {
        setProfile(null)
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signInMock(role = 'user') {
    try {
      localStorage.setItem(MOCK_ROLE_KEY, role)
    } catch {}
    let credential = null
    try {
      credential = await signInAnonymously(auth)
    } catch {
      // Fall back to session-only mock if anonymous auth is unavailable.
    }
    const uid = credential?.user?.uid || MOCK_USER.uid
    const sessionUser = mockUser(role, uid)
    const profileData = mockProfile(role, uid)
    setUser(sessionUser)
    setProfile(profileData)
    await syncMockProfile(profileData)
    return sessionUser
  }

  async function ensureProfile(firebaseUser, extra = {}) {
    const docRef = doc(db, 'users', firebaseUser.uid)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      const data = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email,
        role: 'user',
        masjidIds: [],
        createdAt: new Date().toISOString(),
        ...extra,
      }
      await setDoc(docRef, data)
      return data
    }
    return docSnap.data()
  }

  async function login(role = 'user') {
    if (MOCK_AUTH) return signInMock(role)
    const credential = await signInWithEmailAndPassword(auth, role, role)
    const profileData = await ensureProfile(credential.user)
    setProfile(profileData)
    return credential.user
  }

  async function register(role = 'user') {
    if (MOCK_AUTH) return signInMock(role)
    const credential = await createUserWithEmailAndPassword(auth, role, role)
    await updateProfile(credential.user, { displayName: role })
    const profileData = await ensureProfile(credential.user, { name: role })
    setProfile(profileData)
    return credential.user
  }

  async function loginWithGoogle(role = 'user') {
    if (MOCK_AUTH) return signInMock(role)
    const credential = await signInWithPopup(auth, googleProvider)
    const profileData = await ensureProfile(credential.user, {
      name: credential.user.displayName,
    })
    setProfile(profileData)
    return credential.user
  }

  async function logout() {
    if (MOCK_AUTH) {
      try {
        localStorage.removeItem(MOCK_ROLE_KEY)
      } catch {}
    }
    try {
      await signOut(auth)
    } catch {}
    setProfile(null)
    setUser(null)
  }

  const value = {
    user,
    profile,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
