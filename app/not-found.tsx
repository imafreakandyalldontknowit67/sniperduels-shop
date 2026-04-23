import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl sm:text-8xl font-bold text-accent mb-4 uppercase">404</h1>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 uppercase">Page Not Found</h2>
        <p className="text-gray-400 text-xs sm:text-sm uppercase mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="relative inline-flex items-center justify-center pixel-btn-press"
            style={{ textDecoration: 'none' }}
          >
            <img
              src="/images/pixel/pngs/asset-59.png"
              alt=""
              className="h-[48px] sm:h-[52px] w-auto"
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider">
              Go Home
            </span>
          </Link>
          <Link
            href="/gems"
            className="relative inline-flex items-center justify-center pixel-btn-press"
            style={{ textDecoration: 'none' }}
          >
            <img
              src="/images/pixel/pngs/asset-60.png"
              alt=""
              className="h-[48px] sm:h-[52px] w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">
              Buy Gems
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
