import { Fragment } from 'react'
import { HOW_IT_WORKS_STEPS } from '@/lib/constants'

const stepIcons: Record<number, string> = {
  1: '/images/pixel/pngs/asset-96.png',
  2: '/images/pixel/icon-coins.svg',
  3: '/images/pixel/icon-sniper.svg',
  4: '/images/pixel/icon-roblox.svg',
  5: '/images/pixel/icon-crate.svg',
}


export function HowItWorks() {
  return (
    <section id="howitworks" className="py-12 sm:py-16 md:py-20 bg-dark-900">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-10 md:mb-14">
          <h2 className="text-accent text-2xl sm:text-3xl md:text-4xl font-bold uppercase mb-3">
            How It Works
          </h2>
          <p className="text-white max-w-2xl mx-auto text-[10px] sm:text-xs md:text-sm uppercase leading-relaxed">
            Our <span className="text-white font-bold">5 step automatic delivery system</span> will get your items in a matter of <span className="text-white font-bold underline">minutes</span>
          </p>
        </div>

        {/* Steps - horizontal flow with arrows */}
        <div className="relative">
          {/* Desktop: 5 steps with arrows between */}
          <div className="hidden lg:flex lg:items-start lg:justify-center lg:gap-0">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <Fragment key={step.step}>
                <div className="flex flex-col items-center text-center" style={{ width: '140px' }}>
                  {/* Icon in pixel speech bubble */}
                  <div className="relative w-[96px] h-[96px] flex items-center justify-center mb-5 mx-auto ">
                    <img
                      src="/images/pixel/pngs/asset-72.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    <img
                      src={stepIcons[step.step]}
                      alt=""
                      className={`relative object-contain ${step.step === 1 ? 'h-14 w-14 -mt-2' : 'h-10 w-10 -mt-1'}`}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="mb-2 text-accent font-bold text-sm md:text-base uppercase tracking-wider leading-tight max-w-[140px]">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white text-[10px] md:text-xs uppercase leading-relaxed max-w-[150px]">
                    {step.description}
                  </p>
                </div>

                {/* Arrow between steps */}
                {index < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div className="flex items-center justify-center flex-shrink-0" style={{ paddingTop: '28px', width: '60px' }}>
                    <img
                      src="/images/pixel/icon-login-person.svg"
                      alt=""
                      className="h-6 w-auto"
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Tablet: horizontal with arrows */}
          <div className="hidden sm:flex lg:hidden sm:items-start sm:justify-center sm:gap-0">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <Fragment key={step.step}>
                <div className="flex flex-col items-center text-center" style={{ width: '110px' }}>
                  <div className="relative w-[70px] h-[70px] flex items-center justify-center mb-3 mx-auto ">
                    <img
                      src="/images/pixel/pngs/asset-72.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    <img
                      src={stepIcons[step.step]}
                      alt=""
                      className={`relative object-contain ${step.step === 1 ? 'h-10 w-10 -mt-1.5' : 'h-7 w-7 -mt-1'}`}
                    />
                  </div>
                  <h3 className="mb-2 text-accent font-bold text-xs sm:text-sm uppercase tracking-wider leading-tight max-w-[110px]">
                    {step.title}
                  </h3>
                  <p className="text-white text-[10px] uppercase leading-relaxed max-w-[120px]">
                    {step.description}
                  </p>
                </div>
                {index < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div className="flex items-center justify-center flex-shrink-0" style={{ paddingTop: '22px', width: '40px' }}>
                    <img
                      src="/images/pixel/icon-login-person.svg"
                      alt=""
                      className="h-5 w-auto"
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Mobile: vertical list */}
          <div className="sm:hidden flex flex-col gap-5">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.step} className="flex items-start gap-4">
                <div className="relative w-[48px] h-[48px] flex-shrink-0 flex items-center justify-center">
                  <img
                    src="/images/pixel/pngs/asset-72.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <img
                    src={stepIcons[step.step]}
                    alt=""
                    className={`relative object-contain ${step.step === 1 ? 'h-8 w-8 -mt-1' : 'h-5 w-5 -mt-0.5'}`}
                  />
                </div>
                <div className="pt-1">
                  <h3 className="mb-1 text-accent font-bold text-xs uppercase tracking-wider leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-white text-[10px] uppercase leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
