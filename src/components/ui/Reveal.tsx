"use client";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const ease = [0.22, 0.8, 0.24, 1] as const;

export function Reveal({ children, delay = 0, y = 24, className, as = "div" }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li";
}) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </M>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item: Variants = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } };

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.ul className={className} variants={container} initial={reduce ? false : "hidden"} whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      {children}
    </motion.ul>
  );
}
export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <motion.li className={className} variants={item}>{children}</motion.li>;
}
