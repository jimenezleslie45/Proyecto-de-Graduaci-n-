import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

const StatCard = ({ icon: Icon, value, label, color = 'primary', className }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'relative overflow-hidden rounded-3xl p-8 shadow-glow hover:shadow-glow-lg bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 border-0',
      color === 'green' && 'from-emerald-400/20 to-emerald-500/20 dark:from-emerald-900/50',
      color === 'red' && 'from-rose-400/20 to-rose-500/20 dark:from-rose-900/50',
      className
    )}
    whileHover={{ scale: 1.05, rotateX: 5 }}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent dark:via-black/10" />
    <div className="relative z-10 flex items-center gap-4">
      <motion.div 
        className={cn(
          'p-4 rounded-2xl shadow-glow-lg w-16 h-16 flex items-center justify-center animate-float',
          color === 'green' && 'bg-emerald-500/20 backdrop-blur-xl',
          color === 'red' && 'bg-rose-500/20 backdrop-blur-xl'
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <Icon className="w-8 h-8 text-white drop-shadow-lg" />
      </motion.div>
      <div>
        <p className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent drop-shadow-lg">
          {value}
        </p>
        <p className="text-sm font-medium text-text-secondary mt-1">{label}</p>
      </div>
    </div>
  </motion.div>
)

export { StatCard }

