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

const AuthContext = createContext(null)

const MOCK_USER = {
  uid: 'mock-user',
  email: 'admin@salafic.dev',
  displayName: 'Mock Admin',
}

const MOCK_PROFILE = {
  uid: 'mock-user',
  name: 'Mock Admin',
  email: 'admin@salafic.dev',
  role: 'superadmin',
  masjidIds: [],
  createdAt: new Date().toISOString(),
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (MOCK_AUTH ? MOCK_USER : null))
  const [profile, setProfile] = useState(() => (MOCK_AUTH ? MOCK_PROFILE : null))
  const [loading, setLoading] = useState(MOCK_AUTH ? false : true)

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

  async function signInMock() {
    setUser(MOCK_USER)
    setProfile(MOCK_PROFILE)
    return MOCK_USER
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

  async function login() {
    if (MOCK_AUTH) return signInMock()
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const profileData = await ensureProfile(credential.user)
    setProfile(profileData)
    return credential.user
  }

  async function register() {
    if (MOCK_AUTH) return signInMock()
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName: name })
    const profileData = await ensureProfile(credential.user, { name })
    setProfile(profileData)
    return credential.user
  }

  async function loginWithGoogle() {
    if (MOCK_AUTH) return signInMock()
    const credential = await signInWithPopup(auth, googleProvider)
    const profileData = await ensureProfile(credential.user, {
      name: credential.user.displayName,
    })
    setProfile(profileData)
    return credential.user
  }

  async function logout() {
    if (MOCK_AUTH) {
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
