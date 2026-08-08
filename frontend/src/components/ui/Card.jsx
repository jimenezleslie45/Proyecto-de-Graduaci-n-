import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'

const Card = motion.div

Card.defaultProps = {
  className: cn(
    'group/card bg-bg-secondary/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-3d hover:shadow-glow dark:bg-bg-secondary/30 hover:dark:shadow-glow dark:border-border/70 transition-all duration-500 hover:-translate-y-2 hover:rotate-1',
    'glass-effect'
  )
}

export { Card }
