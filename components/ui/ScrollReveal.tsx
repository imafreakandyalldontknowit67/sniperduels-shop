'use client'

import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver'

interface ScrollRevealProps {
  children: React.ReactNode
  animation?: 'pixel-fade-up' | 'pixel-fade-in' | 'pixel-scale-in'
  delay?: number
  className?: string
  threshold?: number
}

export function ScrollReveal({
  children,
  animation = 'pixel-fade-up',
  delay = 0,
  className = '',
  threshold = 0.15,
}: ScrollRevealProps) {
  const { ref, isVisible } = useIntersectionObserver(threshold)

  return (
    <div
      ref={ref}
      className={`${isVisible ? `animate-${animation}` : 'opacity-0'} ${className}`}
      style={isVisible && delay > 0 ? { animationDelay: `${delay}ms`, animationFillMode: 'forwards', opacity: 0 } : undefined}
    >
      {children}
    </div>
  )
}
