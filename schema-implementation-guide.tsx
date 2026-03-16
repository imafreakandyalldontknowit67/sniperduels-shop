// =============================================================================
// SCHEMA IMPLEMENTATION GUIDE FOR sniperduels.shop
// =============================================================================
// This file contains copy-paste-ready code snippets for each page.
// Generated: 2026-03-16
// =============================================================================


// =============================================================================
// 1. GLOBAL SCHEMA — Add to app/layout.tsx
// =============================================================================
// Insert this <script> tag inside the <head> element (or inside <html> before <body>).
// In Next.js App Router, you can add it directly in the RootLayout body since
// Next.js will hoist <script type="application/ld+json"> appropriately.
//
// Place this INSIDE the <body> tag, right before <PostHogProvider>:

const GLOBAL_SCHEMA = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://sniperduels.shop/#organization",
      "name": "Sniper Duels Auto Shop",
      "url": "https://sniperduels.shop",
      "logo": {
        "@type": "ImageObject",
        "url": "https://sniperduels.shop/gem_icon.png"
      },
      "description": "The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.",
      "sameAs": [
        "https://discord.gg/sniperduels"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "url": "https://discord.gg/sniperduels"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://sniperduels.shop/#website",
      "name": "sniperduels.shop",
      "url": "https://sniperduels.shop",
      "description": "The first automated item shop for Sniper Duels. Purchase gems, items, and crates with automatic 24/7 delivery.",
      "publisher": {
        "@id": "https://sniperduels.shop/#organization"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://sniperduels.shop/shop?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
</script>
`;


// =============================================================================
// 2. FAQ PAGE SCHEMA — Add to app/faq/page.tsx
// =============================================================================
// NOTE: FAQPage rich results are restricted to government/healthcare sites
// since August 2023. This schema still provides value for:
//   - AI/LLM citation (ChatGPT, Gemini, Perplexity)
//   - Generative Engine Optimization (GEO)
//   - General semantic understanding by search engines
//
// Add this <script> tag at the end of the component's return JSX,
// right before the closing </div> or as a sibling to the main content:

const FAQ_SCHEMA = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Sniper Duels Auto Shop?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The first fully automated item shop for the Roblox game Sniper Duels. Browse and purchase snipers, knives, crates, and gems with instant automated delivery."
      }
    },
    {
      "@type": "Question",
      "name": "How does the delivery system work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "After purchasing, you'll receive a link to join our private server. Our automated bot will trade you the items directly. The entire process takes under 2 minutes."
      }
    },
    {
      "@type": "Question",
      "name": "How long does delivery take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Most orders are delivered within 2 minutes. You'll be able to track your order status in real-time from your dashboard."
      }
    },
    {
      "@type": "Question",
      "name": "Is this site affiliated with Sniper Duels?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We are an independent third-party marketplace. We are not affiliated with the developers of Sniper Duels."
      }
    },
    {
      "@type": "Question",
      "name": "How do I add funds to my wallet?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Go to your Dashboard and click 'Deposit'. We accept payments through Pandabase. Funds are credited to your wallet instantly after payment confirmation."
      }
    },
    {
      "@type": "Question",
      "name": "What payment methods are accepted?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We accept credit/debit cards and other methods available through our payment processor Pandabase."
      }
    },
    {
      "@type": "Question",
      "name": "Can I withdraw my balance?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Contact us through our Discord server to request a withdrawal."
      }
    },
    {
      "@type": "Question",
      "name": "What is your refund policy?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "If an order cannot be fulfilled, your wallet balance will be automatically refunded. For other refund requests, please contact us on Discord."
      }
    },
    {
      "@type": "Question",
      "name": "Why is my balance different than expected?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your balance may reflect pending orders or loyalty discounts applied to purchases. Check your order history for details."
      }
    },
    {
      "@type": "Question",
      "name": "How do I create an account?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Click 'Login with Roblox' and authorize with your Roblox account. Your account is created automatically -- no separate registration needed."
      }
    },
    {
      "@type": "Question",
      "name": "Is my Roblox account safe?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. We only use Roblox OAuth for authentication. We never have access to your Roblox password or account credentials."
      }
    },
    {
      "@type": "Question",
      "name": "Why should I link my Discord?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Linking Discord gives you a one-time 2.5% discount on your first purchase. It also helps us provide better support."
      }
    },
    {
      "@type": "Question",
      "name": "What is the loyalty program?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The more you spend, the bigger your discount. Silver tier (after $100 spent) gives 0.5% off, Gold tier (after $250 spent) gives 1% off all purchases."
      }
    }
  ]
}
</script>
`;


// =============================================================================
// 3. BREADCRUMB SCHEMAS — Add per-page
// =============================================================================
// Each page should include its own BreadcrumbList.
// In Next.js App Router, the cleanest approach is a reusable component.

const BREADCRUMB_SHOP = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://sniperduels.shop"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Items Shop",
      "item": "https://sniperduels.shop/shop"
    }
  ]
}
</script>
`;

const BREADCRUMB_GEMS = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://sniperduels.shop"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Gems",
      "item": "https://sniperduels.shop/gems"
    }
  ]
}
</script>
`;

const BREADCRUMB_FAQ = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://sniperduels.shop"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "FAQ",
      "item": "https://sniperduels.shop/faq"
    }
  ]
}
</script>
`;


// =============================================================================
// 4. PRODUCT SCHEMA — Gems page (static, add to app/gems/page.tsx)
// =============================================================================

const GEMS_PRODUCT_SCHEMA = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Sniper Duels Gems",
  "description": "In-game gems for Sniper Duels on Roblox. Buy in bulk for better rates. Automated delivery within 2 minutes.",
  "image": "https://sniperduels.shop/gem_icon.png",
  "url": "https://sniperduels.shop/gems",
  "brand": {
    "@type": "Organization",
    "name": "Sniper Duels Auto Shop"
  },
  "category": "Virtual Game Currency",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "USD",
    "lowPrice": "2.65",
    "highPrice": "2.90",
    "offerCount": "2",
    "url": "https://sniperduels.shop/gems"
  }
}
</script>
`;


// =============================================================================
// 5. PRODUCT SCHEMA — Shop items (DYNAMIC, generate in shop page component)
// =============================================================================
// Since the shop page is a 'use client' component that fetches items from
// /api/stock, Product schema must be injected dynamically. The recommended
// approach is to use Next.js metadata or a server component wrapper.
//
// Option A: Create a server component wrapper at app/shop/page.tsx that
//           fetches stock server-side, renders the JSON-LD, then renders
//           the client ShopPage component.
//
// Option B: Use useEffect + dangerouslySetInnerHTML in the client component.
//
// Template for each item (generate one Product per item in the stock list):

const SHOP_ITEM_TEMPLATE = `
// For each item from /api/stock, generate:
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": item.name,
  "description": item.type + " for Sniper Duels on Roblox" + (item.rarity ? " — " + item.rarity + " rarity" : ""),
  "image": item.imageUrl ? "https://sniperduels.shop" + item.imageUrl : undefined,
  "url": "https://sniperduels.shop/shop",
  "brand": {
    "@type": "Organization",
    "name": "Sniper Duels Auto Shop"
  },
  "category": "Virtual Game Items",
  "offers": {
    "@type": "Offer",
    "url": "https://sniperduels.shop/shop",
    "priceCurrency": "USD",
    "price": item.priceUsd.toFixed(2),
    "availability": item.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock"
  }
}
`;


// =============================================================================
// NEXT.JS IMPLEMENTATION PATTERN
// =============================================================================
// The cleanest way in Next.js App Router is to use the built-in script approach.
// For server components, add JSON-LD directly:
//
//   export default function Page() {
//     return (
//       <>
//         <script
//           type="application/ld+json"
//           dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
//         />
//         {/* page content */}
//       </>
//     )
//   }
//
// For client components ('use client'), either:
//   a) Wrap with a server component that provides the schema
//   b) Use next/script with strategy="afterInteractive"
//   c) Use dangerouslySetInnerHTML in the component return
