'use client'

import { useState, useEffect } from 'react'

export function ScrollArrow() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 50) setVisible(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-8 inset-x-0 flex justify-center z-20 pointer-events-none">
      <img
        src="/images/pixel/pngs/asset-86.png"
        alt=""
        className="h-6 sm:h-8 w-auto animate-arrow-bounce"
      />
    </div>
  )
}
