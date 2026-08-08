import { useTheme } from '../../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'
import { Button } from './Button'
import { motion } from 'framer-motion'

export const ThemeToggle = () => {
  const { toggleTheme, isDark } = useTheme()

  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={toggleTheme}
      className="w-12 h-12 p-0 rounded-xl shadow-glow hover:shadow-glow-lg"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0"
      />
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  )
}

