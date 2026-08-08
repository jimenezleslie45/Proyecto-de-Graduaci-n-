import { motion } from 'framer-motion'

const HotelLogo = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.7, ease: 'easeOut' }}
    className="relative w-20 h-20"
  >
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-100 via-amber-200 to-amber-100 shadow-[0_20px_45px_-24px_rgba(245,158,11,0.8)]" />
    <svg viewBox="0 0 84 84" className="relative w-full h-full p-3">
      <path d="M 18 58 L 18 26 Q 18 20 24 20 L 60 20 Q 66 20 66 26 L 66 58 Z" fill="#f59e0b" />
      <path d="M 22 26 L 22 16 Q 22 12 26 12 L 58 12 Q 62 12 62 16 L 62 26 Z" fill="#d97706" />
      <rect x="26" y="32" width="8" height="10" rx="2" fill="#fff7c2" />
      <rect x="38" y="32" width="8" height="10" rx="2" fill="#fff7c2" />
      <rect x="50" y="32" width="8" height="10" rx="2" fill="#fff7c2" />
      <rect x="26" y="46" width="8" height="10" rx="2" fill="#fff7c2" />
      <rect x="38" y="46" width="8" height="10" rx="2" fill="#fff7c2" />
      <rect x="50" y="46" width="8" height="10" rx="2" fill="#fff7c2" />
      <path d="M 34 58 L 34 66 L 46 66 L 46 58 Z" fill="#d97706" />
      <g fill="#f59e0b">
        <polygon points="42,6 45,14 53,14 47,18 50,26 42,22 34,26 37,18 31,14 39,14" />
      </g>
    </svg>
  </motion.div>
)

export default HotelLogo

