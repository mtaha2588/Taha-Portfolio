import { motion } from "framer-motion";

/**
 * Fades and lifts its children into view the first time they scroll
 * onto the screen. With "reduce motion" enabled in the OS, the
 * global <MotionConfig reducedMotion="user"> in App.jsx turns the
 * movement off automatically and only the fade remains.
 */
export default function Reveal({ children, delay = 0, y = 24, className = "", as = "div" }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
