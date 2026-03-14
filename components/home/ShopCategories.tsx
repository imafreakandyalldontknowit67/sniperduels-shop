import { SHOP_CATEGORIES } from '@/lib/constants'
import { PixelButton } from '@/components/ui'

const categoryIcons: Record<string, string> = {
  items: '/images/pixel/icon-coins.svg',
  gems: '/gem_icon.png',
  crates: '/images/pixel/icon-crate.svg',
}

export function ShopCategories() {
  return (
    <section id="categories" className="py-12 sm:py-16 md:py-20 bg-dark-900">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-10 md:mb-14">
          <h2 className="text-pixel-blue text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold uppercase mb-3">
            Shop Categories
          </h2>
          <p className="text-white max-w-2xl mx-auto text-[10px] sm:text-xs md:text-sm uppercase leading-relaxed">
            Browse our selection of <span className="text-white font-bold">items, gems and crates</span>, all available through automatic delivery.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {SHOP_CATEGORIES.map((category) => (
            <div
              key={category.id}
              className="relative flex flex-col items-center text-center"
            >
              {/* Frame border image */}
              <img
                src="/images/pixel/pngs/asset-87.png"
                alt=""
                className="absolute inset-0 w-full h-full"
              />

              {/* Content on top of the frame */}
              <div className="relative z-10 flex flex-col items-center pt-4 pb-5 px-8 sm:px-8 h-full">
                {/* Icon */}
                <div className="mb-4">
                  <img
                    src={categoryIcons[category.id] || categoryIcons.items}
                    alt=""
                    className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                  />
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-bold text-pixel-blue mb-2 uppercase">
                  {category.title}
                </h3>

                {/* Description */}
                <p className="text-white text-[10px] sm:text-xs md:text-sm uppercase leading-relaxed mb-4 sm:mb-6 flex-grow">
                  {category.description}
                </p>

                {/* Button */}
                <PixelButton href={category.href} variant="blue" size="md">
                  {category.buttonText}
                </PixelButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
