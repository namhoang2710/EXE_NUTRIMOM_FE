import { Moon, Sun } from '@phosphor-icons/react'
import { useSyncExternalStore } from 'react'
import { getTheme, setTheme, subscribeTheme, type Theme } from '@/core/theme/theme-store'

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light' as Theme)

  const nextTheme = theme === 'light' ? 'dark' : 'light'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Chuyển sang giao diện ${nextTheme === 'dark' ? 'tối' : 'sáng'}`}
      title={`Chuyển sang giao diện ${nextTheme === 'dark' ? 'tối' : 'sáng'}`}
    >
      {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
    </button>
  )
}
