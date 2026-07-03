import { motion } from 'framer-motion'

/* Neumorphic buttons press in on tap. min-h keeps them comfortably
   tappable on touch screens, not just decorative. */
export default function NeuButton({ children, className = '', ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`min-h-11 rounded-xl bg-surface px-4 py-2 font-medium text-ink shadow-neu-sm transition-shadow active:shadow-neu-inset disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
