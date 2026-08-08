import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'
import { forwardRef } from 'react'

const Button = forwardRef(({ className, children, variant = 'default', size = 'default', ...props }, ref) => (
  <motion.button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      variant === 'default' && 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow hover:shadow-glow-lg dark:bg-primary dark:hover:bg-primary/90',
      variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
      variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      size === 'default' && 'h-12 px-6',
      size === 'sm' && 'h-10 rounded-xl px-4',
      size === 'lg' && 'h-14 rounded-3xl px-8 text-lg',
      className
    )}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    {...props}
  >
    {children}
  </motion.button>
))
Button.displayName = 'Button'

export { Button }

