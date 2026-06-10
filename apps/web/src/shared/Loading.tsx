import { motion } from "framer-motion";

export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="loading-screen"
      initial={{ opacity: 0, y: 8 }}
      role="status"
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="loading-spinner" aria-hidden />
      <span>{label}</span>
    </motion.div>
  );
}
