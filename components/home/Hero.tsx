import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dark background with subtle radial gradient */}
      <div className="absolute inset-0 bg-dark-900" />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(30,30,35,1) 0%, rgba(10,10,11,1) 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Headline */}
        <h1 className="font-bold mb-3 sm:mb-4 leading-tight uppercase animate-pixel-fade-in">
          <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[52px]">
            <span className="text-pixel-blue">Your Items, </span>
            <span className="text-pixel-blue">Delivered</span>
          </span>
          <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[52px] text-accent">
            Automatically
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 mb-4 sm:mb-6 max-w-2xl mx-auto uppercase leading-[2] animate-pixel-fade-up opacity-0" style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}>
          The first fully automated item shop for Sniper Duels.
          <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          Browse snipers, knives, and crates - purchase and receive your items automatically
          <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          24/7
        </p>

        {/* Characters with speech bubble badges */}
        <div className="relative mt-4 sm:mt-6 md:mt-8 mb-6 sm:mb-8 animate-pixel-fade-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          {/* Desktop layout */}
          <div className="hidden md:block relative h-[280px] lg:h-[340px]">
            {/* Left character - red, flipped to face right */}
            <div className="absolute left-[5%] bottom-0 flex flex-col items-center gap-2">
              <img
                src="/images/pixel/badge-available-247.svg"
                alt="Available 24/7"
                className="h-[3.75rem] lg:h-[4.75rem] w-auto" style={{ imageRendering: 'pixelated' }}
              />
              <img
                src="/images/pixel/character-red.svg"
                alt=""
                className="h-[110px] lg:h-[140px] w-auto"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>

            {/* Center character - green */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center gap-2">
              <img
                src="/images/pixel/pngs/badge-delivery-2min.png"
                alt="Delivery in under 2 minutes"
                className="h-[3.75rem] lg:h-[4.75rem] w-auto" style={{ imageRendering: 'pixelated' }}
              />
              <img
                src="/images/pixel/character-green.svg"
                alt=""
                className="h-[90px] lg:h-[120px] w-auto"
              />
            </div>

            {/* Right character - blue, lower */}
            <div className="absolute right-[5%] bottom-0 flex flex-col items-center gap-2">
              <img
                src="/images/pixel/badge-fully-automated.svg"
                alt="Fully Automated"
                className="h-[3.75rem] lg:h-[4.75rem] w-auto" style={{ imageRendering: 'pixelated' }}
              />
              <img
                src="/images/pixel/character-blue.svg"
                alt=""
                className="h-[90px] lg:h-[120px] w-auto"
              />
            </div>
          </div>

          {/* Mobile/Tablet layout */}
          <div className="md:hidden flex flex-nowrap items-end justify-center gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <img src="/images/pixel/badge-available-247.svg" alt="" className="h-9 sm:h-[3.25rem] w-auto" style={{ imageRendering: 'pixelated' }} />
              <img src="/images/pixel/character-red.svg" alt="" className="h-16 sm:h-22 w-auto" style={{ transform: 'scaleX(-1)' }} />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <img src="/images/pixel/pngs/badge-delivery-2min.png" alt="" className="h-9 sm:h-[3.25rem] w-auto" style={{ imageRendering: 'pixelated' }} />
              <img src="/images/pixel/character-green.svg" alt="" className="h-14 sm:h-20 w-auto" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <img src="/images/pixel/badge-fully-automated.svg" alt="" className="h-9 sm:h-[3.25rem] w-auto" style={{ imageRendering: 'pixelated' }} />
              <img src="/images/pixel/character-blue.svg" alt="" className="h-14 sm:h-20 w-auto" />
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mb-4 sm:mb-6 animate-pixel-fade-up opacity-0" style={{ animationDelay: '0.45s', animationFillMode: 'forwards' }}>
          <Link
            href="/shop"
            className="relative inline-flex items-center justify-center"
            style={{ textDecoration: 'none' }}
          >
            <img
              src="/images/pixel/pngs/asset-59.png"
              alt=""
              className="h-[64px] sm:h-[68px] w-auto"
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-xs sm:text-sm uppercase tracking-wider">
              Browse the Shop
            </span>
          </Link>
        </div>

      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <img src="/images/pixel/pngs/asset-86.png" alt="" className="h-6 sm:h-8 w-auto animate-arrow-bounce" />
      </div>
    </section>
  )
}
