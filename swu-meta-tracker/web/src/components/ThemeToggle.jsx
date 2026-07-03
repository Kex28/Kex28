import { useEffect, useState } from 'react'
import NeuButton from './NeuButton'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.theme = dark ? 'dark' : 'light'
  }, [dark])

  return (
    <NeuButton
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setDark((value) => !value)}
    >
      {dark ? '☀️' : '🌙'}
    </NeuButton>
  )
}
