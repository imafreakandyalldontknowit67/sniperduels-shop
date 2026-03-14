'use client'

import Link from 'next/link'

interface PixelButtonProps {
  children: React.ReactNode
  variant?: 'gold' | 'blue'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  fullWidth?: boolean
}

const sizeStyles = {
  sm: { height: '34px', fontSize: '9px', padding: '0 16px' },
  md: { height: '42px', fontSize: '11px', padding: '0 24px' },
  lg: { height: '48px', fontSize: '12px', padding: '0 32px' },
}

const variantStyles = {
  gold: {
    background: '#e1ad2d',
    color: '#0a0a0b',
    border: '3px solid #c4961f',
    boxShadow: 'inset 0 -3px 0 0 #c4961f, inset 0 3px 0 0 #f0c040',
    cornerColor: '#f5f5f5',
  },
  blue: {
    background: '#2a7ca3',
    color: '#ffffff',
    border: '3px solid #3bb8e8',
    boxShadow: 'inset 0 -3px 0 0 #1d5c7a, inset 0 3px 0 0 #4ac5f0',
    cornerColor: '#6dd5ff',
  },
}

export function PixelButton({
  children,
  variant = 'gold',
  size = 'md',
  href,
  onClick,
  disabled = false,
  className = '',
  fullWidth = false,
}: PixelButtonProps) {
  const sStyle = sizeStyles[size]
  const vStyle = variantStyles[variant]

  const style: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textDecoration: 'none',
    height: sStyle.height,
    fontSize: sStyle.fontSize,
    padding: sStyle.padding,
    background: vStyle.background,
    color: vStyle.color,
    border: vStyle.border,
    boxShadow: vStyle.boxShadow,
    width: fullWidth ? '100%' : undefined,
    transition: 'transform 0.1s steps(2), filter 0.1s steps(2)',
  }

  const cornerStyle = (pos: 'tl' | 'br'): React.CSSProperties => ({
    position: 'absolute',
    width: '6px',
    height: '6px',
    background: vStyle.cornerColor,
    pointerEvents: 'none',
    ...(pos === 'tl' ? { top: '-3px', left: '-3px' } : { bottom: '-3px', right: '-3px' }),
  })

  const inner = (
    <>
      <span style={cornerStyle('tl')} />
      <span style={cornerStyle('br')} />
      {children}
    </>
  )

  if (href) {
    return (
      <Link href={href} style={style} className={`pixel-btn-press ${className}`}>
        {inner}
      </Link>
    )
  }

  return (
    <button onClick={onClick} disabled={disabled} style={style} className={`pixel-btn-press ${className}`}>
      {inner}
    </button>
  )
}
