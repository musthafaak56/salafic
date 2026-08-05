import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  onAuthStateChanged,
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
  const [user, setUser] = useState(() =>
    MOCK_AUTH && initialMockRole() ? mockUser(initialMockRole()) : null
  )
  const [profile, setProfile] = useState(() =>
    MOCK_AUTH && initialMockRole() ? mockProfile(initialMockRole()) : null
  )
  const [loading, setLoading] = useState(MOCK_AUTH ? false : true)

  function mockUser(role) {
    return {
      uid: 'mock-user',
      email: MOCK_USER.email(role),
      displayName: MOCK_USER.displayName(role),
    }
  }

  function mockProfile(role) {
    return {
      uid: 'mock-user',
      name: MOCK_USER.displayName(role),
      email: MOCK_USER.email(role),
      role,
      masjidIds: [],
      createdAt: new Date().toISOString(),
    }
  }

  useEffect(() => {
    if (MOCK_AUTH) return undefined

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          setProfile(docSnap.exists() ? docSnap.data() : { role: 'user' })
        } catch {
          setProfile({ role: 'user' })
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signInMock(role = 'user') {
    try {
      localStorage.setItem(MOCK_ROLE_KEY, role)
    } catch {}
    setUser(mockUser(role))
    setProfile(mockProfile(role))
    return mockUser(role)
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
      setUser(null)
      setProfile(null)
      return
    }
    await signOut(auth)
    setProfile(null)
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
