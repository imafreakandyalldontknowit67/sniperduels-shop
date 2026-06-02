/**
 * Hardcoded marketplace listings for UX preview ONLY.
 *
 * Generated from catalog/catalog_full.json by scripts/generate-demo-listings.mjs.
 * Every listing's rarity, FX option, FragTrakr eligibility, conditions, and
 * festive flag is sourced from the canonical in-game catalog — do NOT
 * hand-edit; regenerate via the script when the catalog changes.
 *
 * Wired up when the API receives ?demo=1 (or detail with id="demo-*").
 * No DB writes. Inert in prod unless caller passes the flag explicitly.
 */

export interface DemoListing {
  id: string
  priceUsd: string
  minOfferUsd: string | null
  vaultItem: {
    id: string
    fingerprint: {
      rarity: string
      condition: string
      fx: string | null
      fragtrakr: boolean
      kills: number
      quickscope_kills: number | null
      exist: number
      festive: boolean
    }
    catalog: {
      id: string
      name: string
      weapon: string
      skin: string
      type: 'sniper' | 'knife'
      crate: string | null
      slug: null
    }
    owner: {
      id: string
      name: string
      displayName: string
      avatar: null
    }
  }
}

const LISTINGS: DemoListing[] = [
  {
    "id": "demo-000",
    "priceUsd": "175.44",
    "minOfferUsd": "149.12",
    "vaultItem": {
      "id": "demo-vault-demo-000",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": "RAVEN",
        "fragtrakr": false,
        "kills": 3557,
        "quickscope_kills": null,
        "exist": 25,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-000",
        "name": "DEFAULT | REFLECTANCE",
        "weapon": "DEFAULT",
        "skin": "REFLECTANCE",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-0",
        "name": "blueclock",
        "displayName": "Blueclock",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-001",
    "priceUsd": "168.86",
    "minOfferUsd": "143.53",
    "vaultItem": {
      "id": "demo-vault-demo-001",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "HYSA",
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 29,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-001",
        "name": "SWORD | SCARY DOUG",
        "weapon": "SWORD",
        "skin": "SCARY DOUG",
        "type": "knife",
        "crate": "Exclusive Developer Item - Unobtainable",
        "slug": null
      },
      "owner": {
        "id": "demo-user-1",
        "name": "snipeking",
        "displayName": "SnipeKing",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-002",
    "priceUsd": "188.65",
    "minOfferUsd": "160.35",
    "vaultItem": {
      "id": "demo-vault-demo-002",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "kills": 635,
        "quickscope_kills": null,
        "exist": 28,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-002",
        "name": "DEFAULT | TRUE BLACK",
        "weapon": "DEFAULT",
        "skin": "TRUE BLACK",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-2",
        "name": "firebolt99",
        "displayName": "Firebolt99",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-003",
    "priceUsd": "137.77",
    "minOfferUsd": "117.10",
    "vaultItem": {
      "id": "demo-vault-demo-003",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 2864,
        "quickscope_kills": 1066,
        "exist": 37,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-003",
        "name": "INTERVENTION | TRUE INVERTED",
        "weapon": "INTERVENTION",
        "skin": "TRUE INVERTED",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-3",
        "name": "valkyrie",
        "displayName": "ValkyrieX",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-004",
    "priceUsd": "288.76",
    "minOfferUsd": "245.45",
    "vaultItem": {
      "id": "demo-vault-demo-004",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": "ASTRALPLAIN",
        "fragtrakr": true,
        "kills": 723,
        "quickscope_kills": null,
        "exist": 44,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-004",
        "name": "DEFAULT | INVERTED",
        "weapon": "DEFAULT",
        "skin": "INVERTED",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-4",
        "name": "kira_",
        "displayName": "Kira_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-005",
    "priceUsd": "235.53",
    "minOfferUsd": "200.20",
    "vaultItem": {
      "id": "demo-vault-demo-005",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 1842,
        "quickscope_kills": null,
        "exist": 41,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-005",
        "name": "DEFAULT | TRUE WHITE",
        "weapon": "DEFAULT",
        "skin": "TRUE WHITE",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-5",
        "name": "pulsewave",
        "displayName": "PulseWave",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-006",
    "priceUsd": "126.05",
    "minOfferUsd": "107.14",
    "vaultItem": {
      "id": "demo-vault-demo-006",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 972,
        "quickscope_kills": 347,
        "exist": 36,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-006",
        "name": "SHOTGUN | MLG",
        "weapon": "SHOTGUN",
        "skin": "MLG",
        "type": "sniper",
        "crate": "April Fools 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-6",
        "name": "nightraven",
        "displayName": "NightRaven",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-007",
    "priceUsd": "193.01",
    "minOfferUsd": "164.06",
    "vaultItem": {
      "id": "demo-vault-demo-007",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "LOVESHOT",
        "fragtrakr": true,
        "kills": 2185,
        "quickscope_kills": null,
        "exist": 18,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-007",
        "name": "DEFAULT | TRUE PINK",
        "weapon": "DEFAULT",
        "skin": "TRUE PINK",
        "type": "sniper",
        "crate": "Valentines 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-7",
        "name": "blue_zenith",
        "displayName": "BlueZenith",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-008",
    "priceUsd": "134.61",
    "minOfferUsd": "114.42",
    "vaultItem": {
      "id": "demo-vault-demo-008",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "MINT CONDITION",
        "fx": "PLAGUEBORN",
        "fragtrakr": false,
        "kills": 1985,
        "quickscope_kills": null,
        "exist": 191,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-008",
        "name": "DEAGLE | VANILLA",
        "weapon": "DEAGLE",
        "skin": "VANILLA",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-8",
        "name": "eclipse_",
        "displayName": "Eclipse_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-009",
    "priceUsd": "101.73",
    "minOfferUsd": "86.47",
    "vaultItem": {
      "id": "demo-vault-demo-009",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 640,
        "quickscope_kills": 128,
        "exist": 54,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-009",
        "name": "SHOTGUN | VANILLA",
        "weapon": "SHOTGUN",
        "skin": "VANILLA",
        "type": "sniper",
        "crate": "Skin Case #2",
        "slug": null
      },
      "owner": {
        "id": "demo-user-9",
        "name": "retroslop",
        "displayName": "RetroSlop",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-010",
    "priceUsd": "40.09",
    "minOfferUsd": "34.08",
    "vaultItem": {
      "id": "demo-vault-demo-010",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 578,
        "quickscope_kills": null,
        "exist": 95,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-010",
        "name": "VKS | VANILLA",
        "weapon": "VKS",
        "skin": "VANILLA",
        "type": "sniper",
        "crate": "Skin Case #2",
        "slug": null
      },
      "owner": {
        "id": "demo-user-10",
        "name": "galxe",
        "displayName": "Galxe",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-011",
    "priceUsd": "58.05",
    "minOfferUsd": "49.34",
    "vaultItem": {
      "id": "demo-vault-demo-011",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": "VOIDGRASP",
        "fragtrakr": false,
        "kills": 640,
        "quickscope_kills": null,
        "exist": 176,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-011",
        "name": "INTERVENTION | REAPER",
        "weapon": "INTERVENTION",
        "skin": "REAPER",
        "type": "sniper",
        "crate": "Hallows Basket 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-11",
        "name": "scope_god",
        "displayName": "ScopeGod",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-012",
    "priceUsd": "60.23",
    "minOfferUsd": "51.20",
    "vaultItem": {
      "id": "demo-vault-demo-012",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "STANDARD ISSUE",
        "fx": "VOIDGRASP",
        "fragtrakr": false,
        "kills": 772,
        "quickscope_kills": null,
        "exist": 90,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-012",
        "name": "SHOTGUN | ASTRA",
        "weapon": "SHOTGUN",
        "skin": "ASTRA",
        "type": "sniper",
        "crate": "Skin Case #2",
        "slug": null
      },
      "owner": {
        "id": "demo-user-0",
        "name": "blueclock",
        "displayName": "Blueclock",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-013",
    "priceUsd": "145.12",
    "minOfferUsd": "123.35",
    "vaultItem": {
      "id": "demo-vault-demo-013",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "MINT CONDITION",
        "fx": "INFERNO",
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 147,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-013",
        "name": "AWP | DRIFTER",
        "weapon": "AWP",
        "skin": "DRIFTER",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-1",
        "name": "snipeking",
        "displayName": "SnipeKing",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-014",
    "priceUsd": "123.15",
    "minOfferUsd": "104.68",
    "vaultItem": {
      "id": "demo-vault-demo-014",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "STANDARD ISSUE",
        "fx": "LOVESHOT",
        "fragtrakr": false,
        "kills": 212,
        "quickscope_kills": null,
        "exist": 71,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-014",
        "name": "AWP | VANILLA",
        "weapon": "AWP",
        "skin": "VANILLA",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-2",
        "name": "firebolt99",
        "displayName": "Firebolt99",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-015",
    "priceUsd": "176.71",
    "minOfferUsd": "150.20",
    "vaultItem": {
      "id": "demo-vault-demo-015",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "MINT CONDITION",
        "fx": "NOXNOSTRA",
        "fragtrakr": false,
        "kills": 1344,
        "quickscope_kills": 499,
        "exist": 157,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-015",
        "name": "SHOTGUN | WANWOOD",
        "weapon": "SHOTGUN",
        "skin": "WANWOOD",
        "type": "sniper",
        "crate": "Classic Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-3",
        "name": "valkyrie",
        "displayName": "ValkyrieX",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-016",
    "priceUsd": "36.01",
    "minOfferUsd": "30.61",
    "vaultItem": {
      "id": "demo-vault-demo-016",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 458,
        "quickscope_kills": 62,
        "exist": 359,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-016",
        "name": "AWP | 9-BALL",
        "weapon": "AWP",
        "skin": "9-BALL",
        "type": "sniper",
        "crate": "Pool Duels Skin Package",
        "slug": null
      },
      "owner": {
        "id": "demo-user-4",
        "name": "kira_",
        "displayName": "Kira_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-017",
    "priceUsd": "33.40",
    "minOfferUsd": "28.39",
    "vaultItem": {
      "id": "demo-vault-demo-017",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 430,
        "quickscope_kills": null,
        "exist": 237,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-017",
        "name": "AWP | PEPPERMINT",
        "weapon": "AWP",
        "skin": "PEPPERMINT",
        "type": "sniper",
        "crate": "Christmas 2025 Collectable",
        "slug": null
      },
      "owner": {
        "id": "demo-user-5",
        "name": "pulsewave",
        "displayName": "PulseWave",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-018",
    "priceUsd": "28.04",
    "minOfferUsd": "23.83",
    "vaultItem": {
      "id": "demo-vault-demo-018",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 429,
        "quickscope_kills": 161,
        "exist": 173,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-018",
        "name": "VKS | BLOXY COLA",
        "weapon": "VKS",
        "skin": "BLOXY COLA",
        "type": "sniper",
        "crate": "May 2026 Collectable",
        "slug": null
      },
      "owner": {
        "id": "demo-user-6",
        "name": "nightraven",
        "displayName": "NightRaven",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-019",
    "priceUsd": "34.14",
    "minOfferUsd": "29.02",
    "vaultItem": {
      "id": "demo-vault-demo-019",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "WELL WORN",
        "fx": "SURGE",
        "fragtrakr": false,
        "kills": 84,
        "quickscope_kills": null,
        "exist": 458,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-019",
        "name": "DEAGLE | TIGER STRIPE",
        "weapon": "DEAGLE",
        "skin": "TIGER STRIPE",
        "type": "sniper",
        "crate": "January 2026 Collectable",
        "slug": null
      },
      "owner": {
        "id": "demo-user-7",
        "name": "blue_zenith",
        "displayName": "BlueZenith",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-020",
    "priceUsd": "22.83",
    "minOfferUsd": "19.41",
    "vaultItem": {
      "id": "demo-vault-demo-020",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "WELL WORN",
        "fx": "EMPYREAN",
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 423,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-020",
        "name": "AWP | FOR HIM",
        "weapon": "AWP",
        "skin": "FOR HIM",
        "type": "sniper",
        "crate": "Valentines 2026 Collectable",
        "slug": null
      },
      "owner": {
        "id": "demo-user-8",
        "name": "eclipse_",
        "displayName": "Eclipse_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-021",
    "priceUsd": "31.55",
    "minOfferUsd": "26.82",
    "vaultItem": {
      "id": "demo-vault-demo-021",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "MINT CONDITION",
        "fx": "SURGE",
        "fragtrakr": false,
        "kills": 497,
        "quickscope_kills": null,
        "exist": 172,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-021",
        "name": "INTERVENTION | NEW YEARS 2026",
        "weapon": "INTERVENTION",
        "skin": "NEW YEARS 2026",
        "type": "sniper",
        "crate": "New Years 2026 Collectable",
        "slug": null
      },
      "owner": {
        "id": "demo-user-9",
        "name": "retroslop",
        "displayName": "RetroSlop",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-022",
    "priceUsd": "55.64",
    "minOfferUsd": "47.29",
    "vaultItem": {
      "id": "demo-vault-demo-022",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 288,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-022",
        "name": "INTERVENTION | GINGERBREAD",
        "weapon": "INTERVENTION",
        "skin": "GINGERBREAD",
        "type": "sniper",
        "crate": "Christmas Present 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-10",
        "name": "galxe",
        "displayName": "Galxe",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-023",
    "priceUsd": "47.42",
    "minOfferUsd": "40.31",
    "vaultItem": {
      "id": "demo-vault-demo-023",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 774,
        "quickscope_kills": 216,
        "exist": 711,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-023",
        "name": "DEAGLE | SNOWFLAKE",
        "weapon": "DEAGLE",
        "skin": "SNOWFLAKE",
        "type": "sniper",
        "crate": "Christmas Present 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-11",
        "name": "scope_god",
        "displayName": "ScopeGod",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-024",
    "priceUsd": "18.98",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-024",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 1466,
        "quickscope_kills": 168,
        "exist": 369,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-024",
        "name": "AWP | DYNASTY",
        "weapon": "AWP",
        "skin": "DYNASTY",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-0",
        "name": "blueclock",
        "displayName": "Blueclock",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-025",
    "priceUsd": "34.05",
    "minOfferUsd": "28.94",
    "vaultItem": {
      "id": "demo-vault-demo-025",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 575,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-025",
        "name": "INTERVENTION | BLOSSOM",
        "weapon": "INTERVENTION",
        "skin": "BLOSSOM",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-1",
        "name": "snipeking",
        "displayName": "SnipeKing",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-026",
    "priceUsd": "34.06",
    "minOfferUsd": "28.95",
    "vaultItem": {
      "id": "demo-vault-demo-026",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 117,
        "quickscope_kills": null,
        "exist": 585,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-026",
        "name": "INTERVENTION | CODEC",
        "weapon": "INTERVENTION",
        "skin": "CODEC",
        "type": "sniper",
        "crate": "Skin Case #2",
        "slug": null
      },
      "owner": {
        "id": "demo-user-2",
        "name": "firebolt99",
        "displayName": "Firebolt99",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-027",
    "priceUsd": "25.08",
    "minOfferUsd": "21.32",
    "vaultItem": {
      "id": "demo-vault-demo-027",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 409,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-027",
        "name": "INTERVENTION | BLACK VALK",
        "weapon": "INTERVENTION",
        "skin": "BLACK VALK",
        "type": "sniper",
        "crate": "Classic Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-3",
        "name": "valkyrie",
        "displayName": "ValkyrieX",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-028",
    "priceUsd": "63.73",
    "minOfferUsd": "54.17",
    "vaultItem": {
      "id": "demo-vault-demo-028",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "MINT CONDITION",
        "fx": "GIFTSPLOSION",
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 301,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-028",
        "name": "SHOTGUN | EPIC FACE",
        "weapon": "SHOTGUN",
        "skin": "EPIC FACE",
        "type": "sniper",
        "crate": "April Fools 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-4",
        "name": "kira_",
        "displayName": "Kira_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-029",
    "priceUsd": "31.07",
    "minOfferUsd": "26.41",
    "vaultItem": {
      "id": "demo-vault-demo-029",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 464,
        "quickscope_kills": 94,
        "exist": 206,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-029",
        "name": "INTERVENTION | BLACK KNIGHT",
        "weapon": "INTERVENTION",
        "skin": "BLACK KNIGHT",
        "type": "sniper",
        "crate": "Hallows Basket 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-5",
        "name": "pulsewave",
        "displayName": "PulseWave",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-030",
    "priceUsd": "20.58",
    "minOfferUsd": "17.49",
    "vaultItem": {
      "id": "demo-vault-demo-030",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 354,
        "quickscope_kills": 42,
        "exist": 571,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-030",
        "name": "DEFAULT | TIDAL",
        "weapon": "DEFAULT",
        "skin": "TIDAL",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-6",
        "name": "nightraven",
        "displayName": "NightRaven",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-031",
    "priceUsd": "12.99",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-031",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 547,
        "quickscope_kills": null,
        "exist": 1048,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-031",
        "name": "DEFAULT | RING OF FIRE",
        "weapon": "DEFAULT",
        "skin": "RING OF FIRE",
        "type": "sniper",
        "crate": "Classic Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-7",
        "name": "blue_zenith",
        "displayName": "BlueZenith",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-032",
    "priceUsd": "10.42",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-032",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 340,
        "quickscope_kills": null,
        "exist": 1441,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-032",
        "name": "DEFAULT | VELVET",
        "weapon": "DEFAULT",
        "skin": "VELVET",
        "type": "sniper",
        "crate": "Valentines 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-8",
        "name": "eclipse_",
        "displayName": "Eclipse_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-033",
    "priceUsd": "25.01",
    "minOfferUsd": "21.26",
    "vaultItem": {
      "id": "demo-vault-demo-033",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "kills": 561,
        "quickscope_kills": null,
        "exist": 925,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-033",
        "name": "DEFAULT | DANCE DANCE",
        "weapon": "DEFAULT",
        "skin": "DANCE DANCE",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-9",
        "name": "retroslop",
        "displayName": "RetroSlop",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-034",
    "priceUsd": "25.09",
    "minOfferUsd": "21.33",
    "vaultItem": {
      "id": "demo-vault-demo-034",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "kills": 322,
        "quickscope_kills": 60,
        "exist": 1726,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-034",
        "name": "DEFAULT | CAULDRON",
        "weapon": "DEFAULT",
        "skin": "CAULDRON",
        "type": "sniper",
        "crate": "Hallows Basket 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-10",
        "name": "galxe",
        "displayName": "Galxe",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-035",
    "priceUsd": "22.19",
    "minOfferUsd": "18.86",
    "vaultItem": {
      "id": "demo-vault-demo-035",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "kills": 529,
        "quickscope_kills": 87,
        "exist": 1557,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-035",
        "name": "SHOTGUN | TRANSPARENT",
        "weapon": "SHOTGUN",
        "skin": "TRANSPARENT",
        "type": "sniper",
        "crate": "April Fools 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-11",
        "name": "scope_god",
        "displayName": "ScopeGod",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-036",
    "priceUsd": "4.29",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-036",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 67,
        "quickscope_kills": 17,
        "exist": 5098,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-036",
        "name": "DEFAULT | INDUSTRIAL",
        "weapon": "DEFAULT",
        "skin": "INDUSTRIAL",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-0",
        "name": "blueclock",
        "displayName": "Blueclock",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-037",
    "priceUsd": "9.96",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-037",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 36,
        "quickscope_kills": 9,
        "exist": 5908,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-037",
        "name": "DEFAULT | NICE PRESENT",
        "weapon": "DEFAULT",
        "skin": "NICE PRESENT",
        "type": "sniper",
        "crate": "Christmas Present 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-1",
        "name": "snipeking",
        "displayName": "SnipeKing",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-038",
    "priceUsd": "5.11",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-038",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 5619,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-038",
        "name": "DEFAULT | PINK CAMO",
        "weapon": "DEFAULT",
        "skin": "PINK CAMO",
        "type": "sniper",
        "crate": "Valentines 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-2",
        "name": "firebolt99",
        "displayName": "Firebolt99",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-039",
    "priceUsd": "9.74",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-039",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 5716,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-039",
        "name": "DEFAULT | STALKER",
        "weapon": "DEFAULT",
        "skin": "STALKER",
        "type": "sniper",
        "crate": "Hallows Basket 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-3",
        "name": "valkyrie",
        "displayName": "ValkyrieX",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-040",
    "priceUsd": "0.99",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-040",
      "fingerprint": {
        "rarity": "COMMON",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 4464,
        "quickscope_kills": null,
        "exist": 24910,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-040",
        "name": "INTERVENTION | TEST",
        "weapon": "INTERVENTION",
        "skin": "TEST",
        "type": "sniper",
        "crate": "",
        "slug": null
      },
      "owner": {
        "id": "demo-user-4",
        "name": "kira_",
        "displayName": "Kira_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-041",
    "priceUsd": "64.61",
    "minOfferUsd": "54.92",
    "vaultItem": {
      "id": "demo-vault-demo-041",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 32,
        "quickscope_kills": 8,
        "exist": 617,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-041",
        "name": "KATANA | CHERRY",
        "weapon": "KATANA",
        "skin": "CHERRY",
        "type": "knife",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-5",
        "name": "pulsewave",
        "displayName": "PulseWave",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-042",
    "priceUsd": "47.27",
    "minOfferUsd": "40.18",
    "vaultItem": {
      "id": "demo-vault-demo-042",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 1178,
        "quickscope_kills": null,
        "exist": 2580,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-042",
        "name": "SFO TH SWORD | LINKED SWORD",
        "weapon": "SFO TH SWORD",
        "skin": "LINKED SWORD",
        "type": "knife",
        "crate": "Classic Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-6",
        "name": "nightraven",
        "displayName": "NightRaven",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-043",
    "priceUsd": "31.07",
    "minOfferUsd": "26.41",
    "vaultItem": {
      "id": "demo-vault-demo-043",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 2743,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-043",
        "name": "SURVIVOR | SURVIVOR OF DESTINY",
        "weapon": "SURVIVOR",
        "skin": "SURVIVOR OF DESTINY",
        "type": "knife",
        "crate": "April Fools 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-7",
        "name": "blue_zenith",
        "displayName": "BlueZenith",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-044",
    "priceUsd": "25.54",
    "minOfferUsd": "21.71",
    "vaultItem": {
      "id": "demo-vault-demo-044",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "kills": 343,
        "quickscope_kills": null,
        "exist": 2796,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-044",
        "name": "BAYONET | CANDY CORN",
        "weapon": "BAYONET",
        "skin": "CANDY CORN",
        "type": "knife",
        "crate": "Hallows Basket 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-8",
        "name": "eclipse_",
        "displayName": "Eclipse_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-045",
    "priceUsd": "69.71",
    "minOfferUsd": "59.25",
    "vaultItem": {
      "id": "demo-vault-demo-045",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 1028,
        "quickscope_kills": null,
        "exist": 2728,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-045",
        "name": "BAYONET | RUBY",
        "weapon": "BAYONET",
        "skin": "RUBY",
        "type": "knife",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-9",
        "name": "retroslop",
        "displayName": "RetroSlop",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-046",
    "priceUsd": "38.66",
    "minOfferUsd": "32.86",
    "vaultItem": {
      "id": "demo-vault-demo-046",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 2550,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-046",
        "name": "SURVIVOR | VANILLA",
        "weapon": "SURVIVOR",
        "skin": "VANILLA",
        "type": "knife",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-10",
        "name": "galxe",
        "displayName": "Galxe",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-047",
    "priceUsd": "63.25",
    "minOfferUsd": "53.76",
    "vaultItem": {
      "id": "demo-vault-demo-047",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 417,
        "quickscope_kills": 67,
        "exist": 2744,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-047",
        "name": "KARAMBIT | ADURITE",
        "weapon": "KARAMBIT",
        "skin": "ADURITE",
        "type": "knife",
        "crate": "Classic Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-11",
        "name": "scope_god",
        "displayName": "ScopeGod",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-048",
    "priceUsd": "22.39",
    "minOfferUsd": "19.03",
    "vaultItem": {
      "id": "demo-vault-demo-048",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 1440,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-048",
        "name": "KARAMBIT | OG BLUESTEEL",
        "weapon": "KARAMBIT",
        "skin": "OG BLUESTEEL",
        "type": "knife",
        "crate": "Classic Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-0",
        "name": "blueclock",
        "displayName": "Blueclock",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-049",
    "priceUsd": "54.60",
    "minOfferUsd": "46.41",
    "vaultItem": {
      "id": "demo-vault-demo-049",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 2719,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-049",
        "name": "BUTTERFLY | DAMASCUS",
        "weapon": "BUTTERFLY",
        "skin": "DAMASCUS",
        "type": "knife",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-1",
        "name": "snipeking",
        "displayName": "SnipeKing",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-050",
    "priceUsd": "38.00",
    "minOfferUsd": "32.30",
    "vaultItem": {
      "id": "demo-vault-demo-050",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 25,
        "quickscope_kills": 3,
        "exist": 1557,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-050",
        "name": "BAYONET | CULTIST",
        "weapon": "BAYONET",
        "skin": "CULTIST",
        "type": "knife",
        "crate": "Hallows Basket 2025",
        "slug": null
      },
      "owner": {
        "id": "demo-user-2",
        "name": "firebolt99",
        "displayName": "Firebolt99",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-051",
    "priceUsd": "54.56",
    "minOfferUsd": "46.38",
    "vaultItem": {
      "id": "demo-vault-demo-051",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 822,
        "quickscope_kills": null,
        "exist": 488,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-051",
        "name": "BUTTERFLY | DARKSTEEL",
        "weapon": "BUTTERFLY",
        "skin": "DARKSTEEL",
        "type": "knife",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-3",
        "name": "valkyrie",
        "displayName": "ValkyrieX",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-052",
    "priceUsd": "74.60",
    "minOfferUsd": "63.41",
    "vaultItem": {
      "id": "demo-vault-demo-052",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "kills": 145,
        "quickscope_kills": null,
        "exist": 2503,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-052",
        "name": "BAYONET | BOMBASTIC",
        "weapon": "BAYONET",
        "skin": "BOMBASTIC",
        "type": "knife",
        "crate": "Classic Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-4",
        "name": "kira_",
        "displayName": "Kira_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-053",
    "priceUsd": "22.68",
    "minOfferUsd": "19.28",
    "vaultItem": {
      "id": "demo-vault-demo-053",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 749,
        "quickscope_kills": null,
        "exist": 886,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-053",
        "name": "SURVIVOR | HEARTBREAK",
        "weapon": "SURVIVOR",
        "skin": "HEARTBREAK",
        "type": "knife",
        "crate": "Valentines 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-5",
        "name": "pulsewave",
        "displayName": "PulseWave",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-054",
    "priceUsd": "51.67",
    "minOfferUsd": "43.92",
    "vaultItem": {
      "id": "demo-vault-demo-054",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "kills": 505,
        "quickscope_kills": null,
        "exist": 2463,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-054",
        "name": "BAYONET | BAYONET OF DESTINY",
        "weapon": "BAYONET",
        "skin": "BAYONET OF DESTINY",
        "type": "knife",
        "crate": "April Fools 2026",
        "slug": null
      },
      "owner": {
        "id": "demo-user-6",
        "name": "nightraven",
        "displayName": "NightRaven",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-055",
    "priceUsd": "144.26",
    "minOfferUsd": "122.62",
    "vaultItem": {
      "id": "demo-vault-demo-055",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 962,
        "quickscope_kills": null,
        "exist": 25,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-055",
        "name": "DEFAULT | REFLECTANCE",
        "weapon": "DEFAULT",
        "skin": "REFLECTANCE",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-7",
        "name": "blue_zenith",
        "displayName": "BlueZenith",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-056",
    "priceUsd": "200.85",
    "minOfferUsd": "170.72",
    "vaultItem": {
      "id": "demo-vault-demo-056",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": "AFFECTION",
        "fragtrakr": true,
        "kills": 469,
        "quickscope_kills": null,
        "exist": 56,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-056",
        "name": "DEFAULT | REFLECTANCE",
        "weapon": "DEFAULT",
        "skin": "REFLECTANCE",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-8",
        "name": "eclipse_",
        "displayName": "Eclipse_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-057",
    "priceUsd": "149.49",
    "minOfferUsd": "127.07",
    "vaultItem": {
      "id": "demo-vault-demo-057",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 2761,
        "quickscope_kills": 576,
        "exist": 29,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-057",
        "name": "SWORD | SCARY DOUG",
        "weapon": "SWORD",
        "skin": "SCARY DOUG",
        "type": "knife",
        "crate": "Exclusive Developer Item - Unobtainable",
        "slug": null
      },
      "owner": {
        "id": "demo-user-9",
        "name": "retroslop",
        "displayName": "RetroSlop",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-058",
    "priceUsd": "197.14",
    "minOfferUsd": "167.57",
    "vaultItem": {
      "id": "demo-vault-demo-058",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "ASCENDED",
        "fragtrakr": false,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 42,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-058",
        "name": "SWORD | SCARY DOUG",
        "weapon": "SWORD",
        "skin": "SCARY DOUG",
        "type": "knife",
        "crate": "Exclusive Developer Item - Unobtainable",
        "slug": null
      },
      "owner": {
        "id": "demo-user-10",
        "name": "galxe",
        "displayName": "Galxe",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-059",
    "priceUsd": "219.48",
    "minOfferUsd": "186.56",
    "vaultItem": {
      "id": "demo-vault-demo-059",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 3096,
        "quickscope_kills": null,
        "exist": 23,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-059",
        "name": "DEFAULT | TRUE BLACK",
        "weapon": "DEFAULT",
        "skin": "TRUE BLACK",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-11",
        "name": "scope_god",
        "displayName": "ScopeGod",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-060",
    "priceUsd": "180.85",
    "minOfferUsd": "153.72",
    "vaultItem": {
      "id": "demo-vault-demo-060",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": "SAKURA",
        "fragtrakr": false,
        "kills": 1458,
        "quickscope_kills": null,
        "exist": 59,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-060",
        "name": "DEFAULT | TRUE BLACK",
        "weapon": "DEFAULT",
        "skin": "TRUE BLACK",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-0",
        "name": "blueclock",
        "displayName": "Blueclock",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-061",
    "priceUsd": "116.09",
    "minOfferUsd": "98.68",
    "vaultItem": {
      "id": "demo-vault-demo-061",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 2327,
        "quickscope_kills": null,
        "exist": 53,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-061",
        "name": "INTERVENTION | TRUE INVERTED",
        "weapon": "INTERVENTION",
        "skin": "TRUE INVERTED",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-1",
        "name": "snipeking",
        "displayName": "SnipeKing",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-062",
    "priceUsd": "168.84",
    "minOfferUsd": "143.51",
    "vaultItem": {
      "id": "demo-vault-demo-062",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "kills": 532,
        "quickscope_kills": null,
        "exist": 25,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-062",
        "name": "INTERVENTION | TRUE INVERTED",
        "weapon": "INTERVENTION",
        "skin": "TRUE INVERTED",
        "type": "sniper",
        "crate": "Skin Case #1",
        "slug": null
      },
      "owner": {
        "id": "demo-user-2",
        "name": "firebolt99",
        "displayName": "Firebolt99",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-063",
    "priceUsd": "224.46",
    "minOfferUsd": "190.79",
    "vaultItem": {
      "id": "demo-vault-demo-063",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "kills": 3862,
        "quickscope_kills": null,
        "exist": 52,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-063",
        "name": "DEFAULT | INVERTED",
        "weapon": "DEFAULT",
        "skin": "INVERTED",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-3",
        "name": "valkyrie",
        "displayName": "ValkyrieX",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-064",
    "priceUsd": "199.23",
    "minOfferUsd": "169.35",
    "vaultItem": {
      "id": "demo-vault-demo-064",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "kills": 1191,
        "quickscope_kills": null,
        "exist": 17,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-064",
        "name": "DEFAULT | INVERTED",
        "weapon": "DEFAULT",
        "skin": "INVERTED",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-4",
        "name": "kira_",
        "displayName": "Kira_",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-065",
    "priceUsd": "191.13",
    "minOfferUsd": "162.46",
    "vaultItem": {
      "id": "demo-vault-demo-065",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "GALACTICBREEZE",
        "fragtrakr": true,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 48,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-065",
        "name": "DEFAULT | TRUE WHITE",
        "weapon": "DEFAULT",
        "skin": "TRUE WHITE",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-5",
        "name": "pulsewave",
        "displayName": "PulseWave",
        "avatar": null
      }
    }
  },
  {
    "id": "demo-066",
    "priceUsd": "157.09",
    "minOfferUsd": "133.53",
    "vaultItem": {
      "id": "demo-vault-demo-066",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "kills": 0,
        "quickscope_kills": null,
        "exist": 57,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-066",
        "name": "DEFAULT | TRUE WHITE",
        "weapon": "DEFAULT",
        "skin": "TRUE WHITE",
        "type": "sniper",
        "crate": "Release Case",
        "slug": null
      },
      "owner": {
        "id": "demo-user-6",
        "name": "nightraven",
        "displayName": "NightRaven",
        "avatar": null
      }
    }
  }
]

export function getDemoListings(): DemoListing[] {
  return LISTINGS
}

export function findDemoListing(id: string): DemoListing | null {
  return LISTINGS.find(l => l.id === id) ?? null
}

export function isDemoId(id: string): boolean {
  return id.startsWith('demo-')
}
