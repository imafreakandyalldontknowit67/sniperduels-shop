interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  featured?: boolean
}

export function Card({
  children,
  className = '',
  hover = false,
  featured = false,
}: CardProps) {
  const baseStyles = 'bg-dark-700 border-[2px] border-dark-500'
  const hoverStyles = hover ? 'pixel-card-hover hover:border-accent hover:-translate-y-1' : ''
  const featuredStyles = featured ? 'border-accent' : ''

  return (
    <div className={`${baseStyles} ${hoverStyles} ${featuredStyles} ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`px-6 pb-6 ${className}`}>
      {children}
    </div>
  )
}
