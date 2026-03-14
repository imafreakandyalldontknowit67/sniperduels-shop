import Link from 'next/link'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'blue'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent hover:bg-accent-light text-black border-[3px] border-accent-dark pixel-shadow',
  secondary: 'bg-dark-600 hover:bg-dark-500 text-white border-[3px] border-dark-400 pixel-shadow-sm',
  outline: 'border-[3px] border-accent text-accent hover:bg-accent hover:text-black',
  blue: 'bg-pixel-blue-dark hover:bg-pixel-blue text-white border-[3px] border-pixel-blue pixel-shadow-sm',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold uppercase tracking-wider focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'

  const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

  if (href) {
    return (
      <Link href={href} className={combinedStyles}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedStyles}
    >
      {children}
    </button>
  )
}
