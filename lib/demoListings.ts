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
      fragtrak_type: string | null
      kills: number
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
    "priceUsd": "145.21",
    "minOfferUsd": "123.43",
    "vaultItem": {
      "id": "demo-vault-demo-000",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": "RAVEN",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "142.78",
    "minOfferUsd": "121.36",
    "vaultItem": {
      "id": "demo-vault-demo-001",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": "CRYPTIC",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "129.65",
    "minOfferUsd": "110.20",
    "vaultItem": {
      "id": "demo-vault-demo-002",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "177.90",
    "minOfferUsd": "151.22",
    "vaultItem": {
      "id": "demo-vault-demo-003",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "SAKURA",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
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
    "priceUsd": "154.23",
    "minOfferUsd": "131.10",
    "vaultItem": {
      "id": "demo-vault-demo-004",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "QuickscopeKills",
        "kills": 3444,
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
    "priceUsd": "114.48",
    "minOfferUsd": "97.31",
    "vaultItem": {
      "id": "demo-vault-demo-005",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "LowerBodyKills",
        "kills": 270,
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
    "priceUsd": "240.76",
    "minOfferUsd": "204.65",
    "vaultItem": {
      "id": "demo-vault-demo-006",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": "PLAGUEBORN",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "184.61",
    "minOfferUsd": "156.92",
    "vaultItem": {
      "id": "demo-vault-demo-007",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "LowerBodyKills",
        "kills": 2558,
        "festive": true
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
    "priceUsd": "166.20",
    "minOfferUsd": "141.27",
    "vaultItem": {
      "id": "demo-vault-demo-008",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "MINT CONDITION",
        "fx": "CERULEANOZYMANDIAS",
        "fragtrakr": true,
        "fragtrak_type": "QuickscopeKills",
        "kills": 1168,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-008",
        "name": "AWP | CRIMSON OZYMANDIAS",
        "weapon": "AWP",
        "skin": "CRIMSON OZYMANDIAS",
        "type": "sniper",
        "crate": "Classic Case",
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
    "priceUsd": "94.26",
    "minOfferUsd": "80.12",
    "vaultItem": {
      "id": "demo-vault-demo-009",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-009",
        "name": "INTERVENTION | EVERGREEN WINTER",
        "weapon": "INTERVENTION",
        "skin": "EVERGREEN WINTER",
        "type": "sniper",
        "crate": "Christmas Present 2025",
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
    "priceUsd": "59.22",
    "minOfferUsd": "50.34",
    "vaultItem": {
      "id": "demo-vault-demo-010",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": "SHOCK",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-010",
        "name": "SHOTGUN | ASTRA",
        "weapon": "SHOTGUN",
        "skin": "ASTRA",
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
    "priceUsd": "91.25",
    "minOfferUsd": "77.56",
    "vaultItem": {
      "id": "demo-vault-demo-011",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": "REX",
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 1230,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-011",
        "name": "VKS | VANILLA",
        "weapon": "VKS",
        "skin": "VANILLA",
        "type": "sniper",
        "crate": "Skin Case #2",
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
    "priceUsd": "82.96",
    "minOfferUsd": "70.52",
    "vaultItem": {
      "id": "demo-vault-demo-012",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-012",
        "name": "AWP | VANILLA",
        "weapon": "AWP",
        "skin": "VANILLA",
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
    "id": "demo-013",
    "priceUsd": "51.49",
    "minOfferUsd": "43.77",
    "vaultItem": {
      "id": "demo-vault-demo-013",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": "ASCENDED",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-013",
        "name": "AWP | BOREALIS",
        "weapon": "AWP",
        "skin": "BOREALIS",
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
    "id": "demo-014",
    "priceUsd": "72.61",
    "minOfferUsd": "61.72",
    "vaultItem": {
      "id": "demo-vault-demo-014",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "STANDARD ISSUE",
        "fx": "SHOCK",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-014",
        "name": "AWP | VHS",
        "weapon": "AWP",
        "skin": "VHS",
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
    "id": "demo-015",
    "priceUsd": "122.09",
    "minOfferUsd": "103.78",
    "vaultItem": {
      "id": "demo-vault-demo-015",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "NoscopeKills",
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-015",
        "name": "SHOTGUN | GEMS ARE INFINITE",
        "weapon": "SHOTGUN",
        "skin": "GEMS ARE INFINITE",
        "type": "sniper",
        "crate": "April Fools 2026",
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
    "priceUsd": "19.55",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-016",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-016",
        "name": "AWP | CELTIC",
        "weapon": "AWP",
        "skin": "CELTIC",
        "type": "sniper",
        "crate": "March 2026 Collectable",
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
    "priceUsd": "22.78",
    "minOfferUsd": "19.36",
    "vaultItem": {
      "id": "demo-vault-demo-017",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-017",
        "name": "AWP | FOR HER",
        "weapon": "AWP",
        "skin": "FOR HER",
        "type": "sniper",
        "crate": "Valentines 2026 Collectable",
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
    "priceUsd": "19.37",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-018",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "STANDARD ISSUE",
        "fx": "GALACTICBREEZE",
        "fragtrakr": true,
        "fragtrak_type": "QuickscopeKills",
        "kills": 178,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-018",
        "name": "AWP | PEPPERMINT",
        "weapon": "AWP",
        "skin": "PEPPERMINT",
        "type": "sniper",
        "crate": "Christmas 2025 Collectable",
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
    "priceUsd": "32.81",
    "minOfferUsd": "27.89",
    "vaultItem": {
      "id": "demo-vault-demo-019",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "HeadshotKills",
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-019",
        "name": "DEAGLE | CELTIC",
        "weapon": "DEAGLE",
        "skin": "CELTIC",
        "type": "sniper",
        "crate": "March 2026 Collectable",
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
    "priceUsd": "17.35",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-020",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "NoscopeKills",
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-020",
        "name": "SHOTGUN | SHAMROCK",
        "weapon": "SHOTGUN",
        "skin": "SHAMROCK",
        "type": "sniper",
        "crate": "March 2026 Collectable",
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
    "priceUsd": "31.20",
    "minOfferUsd": "26.52",
    "vaultItem": {
      "id": "demo-vault-demo-021",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-021",
        "name": "INTERVENTION | PEPPERMINT",
        "weapon": "INTERVENTION",
        "skin": "PEPPERMINT",
        "type": "sniper",
        "crate": "Christmas 2025 Collectable",
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
    "priceUsd": "39.42",
    "minOfferUsd": "33.51",
    "vaultItem": {
      "id": "demo-vault-demo-022",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "NoscopeKills",
        "kills": 789,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-022",
        "name": "SHOTGUN | EPIC FACE",
        "weapon": "SHOTGUN",
        "skin": "EPIC FACE",
        "type": "sniper",
        "crate": "April Fools 2026",
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
    "priceUsd": "74.36",
    "minOfferUsd": "63.21",
    "vaultItem": {
      "id": "demo-vault-demo-023",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "STANDARD ISSUE",
        "fx": "GUY",
        "fragtrakr": true,
        "fragtrak_type": "HeadshotKills",
        "kills": 491,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-023",
        "name": "AWP | SHOGUN",
        "weapon": "AWP",
        "skin": "SHOGUN",
        "type": "sniper",
        "crate": "Skin Case #1",
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
    "priceUsd": "72.87",
    "minOfferUsd": "61.94",
    "vaultItem": {
      "id": "demo-vault-demo-024",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-024",
        "name": "AWP | SUNSET RUNNER",
        "weapon": "AWP",
        "skin": "SUNSET RUNNER",
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
    "id": "demo-025",
    "priceUsd": "33.27",
    "minOfferUsd": "28.28",
    "vaultItem": {
      "id": "demo-vault-demo-025",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-025",
        "name": "INTERVENTION | VALKYRIE",
        "weapon": "INTERVENTION",
        "skin": "VALKYRIE",
        "type": "sniper",
        "crate": "Classic Case",
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
    "priceUsd": "25.25",
    "minOfferUsd": "21.46",
    "vaultItem": {
      "id": "demo-vault-demo-026",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-026",
        "name": "AWP | RED SPIRAL",
        "weapon": "AWP",
        "skin": "RED SPIRAL",
        "type": "sniper",
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
    "id": "demo-027",
    "priceUsd": "53.07",
    "minOfferUsd": "45.11",
    "vaultItem": {
      "id": "demo-vault-demo-027",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "QuickscopeKills",
        "kills": 102,
        "festive": false
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
    "priceUsd": "31.92",
    "minOfferUsd": "27.13",
    "vaultItem": {
      "id": "demo-vault-demo-028",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-028",
        "name": "INTERVENTION | VIPER",
        "weapon": "INTERVENTION",
        "skin": "VIPER",
        "type": "sniper",
        "crate": "Skin Case #2",
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
    "priceUsd": "25.36",
    "minOfferUsd": "21.56",
    "vaultItem": {
      "id": "demo-vault-demo-029",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-029",
        "name": "DEAGLE | SNOWFLAKE",
        "weapon": "DEAGLE",
        "skin": "SNOWFLAKE",
        "type": "sniper",
        "crate": "Christmas Present 2025",
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
    "priceUsd": "24.74",
    "minOfferUsd": "21.03",
    "vaultItem": {
      "id": "demo-vault-demo-030",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "STANDARD ISSUE",
        "fx": "BLACKLIGHT",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-030",
        "name": "DEFAULT | LIGHTNING",
        "weapon": "DEFAULT",
        "skin": "LIGHTNING",
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
  },
  {
    "id": "demo-031",
    "priceUsd": "8.22",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-031",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-031",
        "name": "DEFAULT | FLEUR DE AMOUR",
        "weapon": "DEFAULT",
        "skin": "FLEUR DE AMOUR",
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
    "id": "demo-032",
    "priceUsd": "20.50",
    "minOfferUsd": "17.43",
    "vaultItem": {
      "id": "demo-vault-demo-032",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-032",
        "name": "DEFAULT | MONARCH",
        "weapon": "DEFAULT",
        "skin": "MONARCH",
        "type": "sniper",
        "crate": "Skin Case #2",
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
    "priceUsd": "9.97",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-033",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "STANDARD ISSUE",
        "fx": "INFERNO",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-033",
        "name": "DEFAULT | PEPPERMINT",
        "weapon": "DEFAULT",
        "skin": "PEPPERMINT",
        "type": "sniper",
        "crate": "Christmas Present 2025",
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
    "priceUsd": "32.09",
    "minOfferUsd": "27.28",
    "vaultItem": {
      "id": "demo-vault-demo-034",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "MINT CONDITION",
        "fx": "AFFECTION",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-034",
        "name": "DEFAULT | CRIME SCENE",
        "weapon": "DEFAULT",
        "skin": "CRIME SCENE",
        "type": "sniper",
        "crate": "Release Case",
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
    "priceUsd": "24.56",
    "minOfferUsd": "20.88",
    "vaultItem": {
      "id": "demo-vault-demo-035",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-035",
        "name": "DEFAULT | TIDAL",
        "weapon": "DEFAULT",
        "skin": "TIDAL",
        "type": "sniper",
        "crate": "Skin Case #1",
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
    "priceUsd": "6.35",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-036",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 205,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-036",
        "name": "DEFAULT | STALKER",
        "weapon": "DEFAULT",
        "skin": "STALKER",
        "type": "sniper",
        "crate": "Hallows Basket 2025",
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
    "priceUsd": "5.59",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-037",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-037",
        "name": "DEFAULT | DISCO",
        "weapon": "DEFAULT",
        "skin": "DISCO",
        "type": "sniper",
        "crate": "Skin Case #2",
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
    "priceUsd": "8.78",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-038",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-038",
        "name": "DEFAULT | TRIBAL",
        "weapon": "DEFAULT",
        "skin": "TRIBAL",
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
    "id": "demo-039",
    "priceUsd": "7.97",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-039",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-039",
        "name": "DEFAULT | GLACIAL",
        "weapon": "DEFAULT",
        "skin": "GLACIAL",
        "type": "sniper",
        "crate": "Christmas Present 2025",
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
    "priceUsd": "2.31",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-040",
      "fingerprint": {
        "rarity": "COMMON",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "30.06",
    "minOfferUsd": "25.55",
    "vaultItem": {
      "id": "demo-vault-demo-041",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-041",
        "name": "SFO TH SWORD | ICE DAGGER",
        "weapon": "SFO TH SWORD",
        "skin": "ICE DAGGER",
        "type": "knife",
        "crate": "Classic Case",
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
    "priceUsd": "54.34",
    "minOfferUsd": "46.19",
    "vaultItem": {
      "id": "demo-vault-demo-042",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-042",
        "name": "KATANA | FROSTBORN",
        "weapon": "KATANA",
        "skin": "FROSTBORN",
        "type": "knife",
        "crate": "Christmas Present 2025",
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
    "priceUsd": "70.91",
    "minOfferUsd": "60.27",
    "vaultItem": {
      "id": "demo-vault-demo-043",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 889,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-043",
        "name": "KARAMBIT | KOI",
        "weapon": "KARAMBIT",
        "skin": "KOI",
        "type": "knife",
        "crate": "Skin Case #1",
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
    "priceUsd": "82.65",
    "minOfferUsd": "70.25",
    "vaultItem": {
      "id": "demo-vault-demo-044",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-044",
        "name": "SURVIVOR | OG BLUESTEEL",
        "weapon": "SURVIVOR",
        "skin": "OG BLUESTEEL",
        "type": "knife",
        "crate": "Classic Case",
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
    "priceUsd": "70.01",
    "minOfferUsd": "59.51",
    "vaultItem": {
      "id": "demo-vault-demo-045",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 1046,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-045",
        "name": "KARAMBIT | OG BLUESTEEL",
        "weapon": "KARAMBIT",
        "skin": "OG BLUESTEEL",
        "type": "knife",
        "crate": "Classic Case",
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
    "priceUsd": "33.25",
    "minOfferUsd": "28.26",
    "vaultItem": {
      "id": "demo-vault-demo-046",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-046",
        "name": "BAYONET | WANWOOD",
        "weapon": "BAYONET",
        "skin": "WANWOOD",
        "type": "knife",
        "crate": "Classic Case",
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
    "priceUsd": "30.04",
    "minOfferUsd": "25.53",
    "vaultItem": {
      "id": "demo-vault-demo-047",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-047",
        "name": "BAYONET | VAMPIRIC",
        "weapon": "BAYONET",
        "skin": "VAMPIRIC",
        "type": "knife",
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
    "id": "demo-048",
    "priceUsd": "61.16",
    "minOfferUsd": "51.99",
    "vaultItem": {
      "id": "demo-vault-demo-048",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-048",
        "name": "DEFAULT | DEFAULT OF DESTINY",
        "weapon": "DEFAULT",
        "skin": "DEFAULT OF DESTINY",
        "type": "knife",
        "crate": "April Fools 2026",
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
    "priceUsd": "27.68",
    "minOfferUsd": "23.53",
    "vaultItem": {
      "id": "demo-vault-demo-049",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-049",
        "name": "KATANA | VANILLA",
        "weapon": "KATANA",
        "skin": "VANILLA",
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
    "priceUsd": "20.27",
    "minOfferUsd": "17.23",
    "vaultItem": {
      "id": "demo-vault-demo-050",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-050",
        "name": "BUTTERFLY | VENOM",
        "weapon": "BUTTERFLY",
        "skin": "VENOM",
        "type": "knife",
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
    "id": "demo-051",
    "priceUsd": "16.54",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-051",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-051",
        "name": "BUTTERFLY | BLACK IRON",
        "weapon": "BUTTERFLY",
        "skin": "BLACK IRON",
        "type": "knife",
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
    "id": "demo-052",
    "priceUsd": "20.39",
    "minOfferUsd": "17.33",
    "vaultItem": {
      "id": "demo-vault-demo-052",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-052",
        "name": "KARAMBIT | SAKURA",
        "weapon": "KARAMBIT",
        "skin": "SAKURA",
        "type": "knife",
        "crate": "Skin Case #1",
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
    "priceUsd": "67.94",
    "minOfferUsd": "57.75",
    "vaultItem": {
      "id": "demo-vault-demo-053",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-053",
        "name": "BAYONET | VANILLA",
        "weapon": "BAYONET",
        "skin": "VANILLA",
        "type": "knife",
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
    "id": "demo-054",
    "priceUsd": "57.80",
    "minOfferUsd": "49.13",
    "vaultItem": {
      "id": "demo-vault-demo-054",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-054",
        "name": "BUTTERFLY | OG BLUESTEEL",
        "weapon": "BUTTERFLY",
        "skin": "OG BLUESTEEL",
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
    "id": "demo-055",
    "priceUsd": "176.13",
    "minOfferUsd": "149.71",
    "vaultItem": {
      "id": "demo-vault-demo-055",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "186.68",
    "minOfferUsd": "158.68",
    "vaultItem": {
      "id": "demo-vault-demo-056",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "105.65",
    "minOfferUsd": "89.80",
    "vaultItem": {
      "id": "demo-vault-demo-057",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "266.90",
    "minOfferUsd": "226.86",
    "vaultItem": {
      "id": "demo-vault-demo-058",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 2171,
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
    "priceUsd": "128.90",
    "minOfferUsd": "109.56",
    "vaultItem": {
      "id": "demo-vault-demo-059",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "207.85",
    "minOfferUsd": "176.67",
    "vaultItem": {
      "id": "demo-vault-demo-060",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "DARKCHAINS",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "166.33",
    "minOfferUsd": "141.38",
    "vaultItem": {
      "id": "demo-vault-demo-061",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "294.92",
    "minOfferUsd": "250.68",
    "vaultItem": {
      "id": "demo-vault-demo-062",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": "SPELLWORK",
        "fragtrakr": true,
        "fragtrak_type": "QuickscopeKills",
        "kills": 1901,
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
    "priceUsd": "139.25",
    "minOfferUsd": "118.36",
    "vaultItem": {
      "id": "demo-vault-demo-063",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "OMEGA",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "256.73",
    "minOfferUsd": "218.22",
    "vaultItem": {
      "id": "demo-vault-demo-064",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": "SHOCK",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
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
    "priceUsd": "221.88",
    "minOfferUsd": "188.60",
    "vaultItem": {
      "id": "demo-vault-demo-065",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "FRIGID",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "205.09",
    "minOfferUsd": "174.33",
    "vaultItem": {
      "id": "demo-vault-demo-066",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "LOVESHOT",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
