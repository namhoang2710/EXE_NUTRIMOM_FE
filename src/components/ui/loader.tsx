"use client"

import { motion, useReducedMotion } from "motion/react"

export function LoaderOne() {
  const reduceMotion = useReducedMotion()

  const transition = (index: number) => ({
    duration: 1,
    repeat: Infinity,
    repeatType: "loop" as const,
    delay: index * 0.2,
    ease: "easeInOut" as const,
  })

  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          initial={{ y: 0 }}
          animate={reduceMotion ? { y: 0 } : { y: [0, 10, 0] }}
          transition={reduceMotion ? { duration: 0 } : transition(index)}
          className="h-4 w-4 rounded-full border border-neutral-300 bg-gradient-to-b from-neutral-400 to-neutral-300"
        />
      ))}
    </div>
  )
}
