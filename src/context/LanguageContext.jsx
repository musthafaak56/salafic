import { createContext, useContext, useState } from 'react'
const Context = createContext({ language: '', setLanguage: () => {} })
export const useLanguage = () => useContext(Context)
export function LanguageProvider({ children }) {
  const [language, update] = useState(() => {
    try {
      return ['en', 'ml', 'ar'].includes(localStorage.getItem('ui-language'))
        ? localStorage.getItem('ui-language')
        : ''
    } catch {
      return ''
    }
  })
  function setLanguage(value) {
    update(value)
    try {
      localStorage.setItem('ui-language', value)
    } catch {}
  }
  return (
    <Context.Provider value={{ language, setLanguage }}>
      {children}
    </Context.Provider>
  )
}
