import { createContext, useContext, useLayoutEffect, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'nrg-scrapbook-theme'

export function savedTheme() {
  try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light' }
  catch { return 'light' }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(savedTheme)
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode
    try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* The toggle also works without storage. */ }
  }, [mode])
  return <ThemeContext.Provider value={{ mode, toggleTheme: () => setMode(value => value === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }
