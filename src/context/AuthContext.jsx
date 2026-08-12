import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        })
        try {
          const docRef = doc(db, 'users', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          setProfile(docSnap.exists() ? docSnap.data() : null)
        } catch {
          setProfile(null)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function ensureProfile(firebaseUser) {
    const docRef = doc(db, 'users', firebaseUser.uid)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) return docSnap.data()
    const data = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || '',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || '',
      role: 'user',
      masjidIds: [],
      createdAt: new Date().toISOString(),
    }
    await setDoc(docRef, data)
    return data
  }

  // Google sign-in. New accounts are created automatically on first
  // sign-in; everyone starts as a regular "user". Admins are granted
  // later by editing the user's document in the Firestore console
  // (role: 'admin'/'superadmin', masjidIds: ['main']).
  async function loginWithGoogle() {
    const credential = await signInWithPopup(auth, googleProvider)
    const profileData = await ensureProfile(credential.user)
    setUser({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName,
    })
    setProfile(profileData)
    return profileData
  }

  async function logout() {
    try {
      await signOut(auth)
    } finally {
      setUser(null)
      setProfile(null)
    }
  }

  const value = {
    user,
    profile,
    loading,
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