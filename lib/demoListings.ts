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
    "priceUsd": "126.74",
    "minOfferUsd": "107.73",
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
    "priceUsd": "122.36",
    "minOfferUsd": "104.01",
    "vaultItem": {
      "id": "demo-vault-demo-001",
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
    "priceUsd": "141.11",
    "minOfferUsd": "119.94",
    "vaultItem": {
      "id": "demo-vault-demo-002",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": "LOVE",
        "fragtrakr": true,
        "fragtrak_type": "LowerBodyKills",
        "kills": 839,
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
    "priceUsd": "191.06",
    "minOfferUsd": "162.40",
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
    "priceUsd": "253.79",
    "minOfferUsd": "215.72",
    "vaultItem": {
      "id": "demo-vault-demo-004",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "SURGE",
        "fragtrakr": true,
        "fragtrak_type": "QuickscopeKills",
        "kills": 3188,
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
    "priceUsd": "120.68",
    "minOfferUsd": "102.58",
    "vaultItem": {
      "id": "demo-vault-demo-005",
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
    "priceUsd": "130.89",
    "minOfferUsd": "111.26",
    "vaultItem": {
      "id": "demo-vault-demo-006",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": "INFERNAL",
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 0,
        "festive": true
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
    "priceUsd": "114.11",
    "minOfferUsd": "96.99",
    "vaultItem": {
      "id": "demo-vault-demo-007",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "LowerBodyKills",
        "kills": 3942,
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
    "priceUsd": "84.27",
    "minOfferUsd": "71.63",
    "vaultItem": {
      "id": "demo-vault-demo-008",
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
        "id": "demo-cat-demo-008",
        "name": "SHOTGUN | GEMS ARE INFINITE",
        "weapon": "SHOTGUN",
        "skin": "GEMS ARE INFINITE",
        "type": "sniper",
        "crate": "April Fools 2026",
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
    "priceUsd": "110.70",
    "minOfferUsd": "94.09",
    "vaultItem": {
      "id": "demo-vault-demo-009",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": "GALACTICBREEZE",
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 1534,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-009",
        "name": "VKS | VANILLA",
        "weapon": "VKS",
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
    "priceUsd": "76.33",
    "minOfferUsd": "64.88",
    "vaultItem": {
      "id": "demo-vault-demo-010",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-010",
        "name": "INTERVENTION | VANILLA",
        "weapon": "INTERVENTION",
        "skin": "VANILLA",
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
    "id": "demo-011",
    "priceUsd": "80.61",
    "minOfferUsd": "68.52",
    "vaultItem": {
      "id": "demo-vault-demo-011",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "STANDARD ISSUE",
        "fx": "NOXNOSTRA",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-011",
        "name": "AWP | CERULEAN OZYMANDIAS",
        "weapon": "AWP",
        "skin": "CERULEAN OZYMANDIAS",
        "type": "sniper",
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
    "id": "demo-012",
    "priceUsd": "99.30",
    "minOfferUsd": "84.41",
    "vaultItem": {
      "id": "demo-vault-demo-012",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "HeadshotKills",
        "kills": 1004,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-012",
        "name": "AWP | BUBBLEGUM",
        "weapon": "AWP",
        "skin": "BUBBLEGUM",
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
    "priceUsd": "110.21",
    "minOfferUsd": "93.68",
    "vaultItem": {
      "id": "demo-vault-demo-013",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "MINT CONDITION",
        "fx": "PLAGUEBORN",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-013",
        "name": "SHOTGUN | VANILLA",
        "weapon": "SHOTGUN",
        "skin": "VANILLA",
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
    "id": "demo-014",
    "priceUsd": "106.75",
    "minOfferUsd": "90.74",
    "vaultItem": {
      "id": "demo-vault-demo-014",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-014",
        "name": "DEAGLE | VANILLA",
        "weapon": "DEAGLE",
        "skin": "VANILLA",
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
    "id": "demo-015",
    "priceUsd": "40.79",
    "minOfferUsd": "34.67",
    "vaultItem": {
      "id": "demo-vault-demo-015",
      "fingerprint": {
        "rarity": "LEGENDARY",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-015",
        "name": "INTERVENTION | HEARTBREAK",
        "weapon": "INTERVENTION",
        "skin": "HEARTBREAK",
        "type": "sniper",
        "crate": "Valentines 2026",
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
    "priceUsd": "26.32",
    "minOfferUsd": "22.37",
    "vaultItem": {
      "id": "demo-vault-demo-016",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "QuickscopeKills",
        "kills": 232,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-016",
        "name": "EXECUTIONER | ASCII WHITE",
        "weapon": "EXECUTIONER",
        "skin": "ASCII WHITE",
        "type": "sniper",
        "crate": "December 2025 Collectable",
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
    "priceUsd": "48.19",
    "minOfferUsd": "40.96",
    "vaultItem": {
      "id": "demo-vault-demo-017",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "MINT CONDITION",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-017",
        "name": "AWP | FOR HIM",
        "weapon": "AWP",
        "skin": "FOR HIM",
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
    "priceUsd": "16.19",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-018",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "STANDARD ISSUE",
        "fx": "INFERNAL",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-018",
        "name": "AWP | CELTIC",
        "weapon": "AWP",
        "skin": "CELTIC",
        "type": "sniper",
        "crate": "March 2026 Collectable",
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
    "priceUsd": "15.49",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-019",
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
        "id": "demo-cat-demo-019",
        "name": "AWP | REX",
        "weapon": "AWP",
        "skin": "REX",
        "type": "sniper",
        "crate": "Rex Skin Package",
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
    "priceUsd": "16.62",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-020",
      "fingerprint": {
        "rarity": "COLLECTABLE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-020",
        "name": "VKS | WITCHES BREW",
        "weapon": "VKS",
        "skin": "WITCHES BREW",
        "type": "sniper",
        "crate": "May 2026 Collectable",
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
    "priceUsd": "10.42",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-021",
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
        "id": "demo-cat-demo-021",
        "name": "AWP | PEPPERMINT",
        "weapon": "AWP",
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
    "priceUsd": "29.70",
    "minOfferUsd": "25.24",
    "vaultItem": {
      "id": "demo-vault-demo-022",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "WELL WORN",
        "fx": "MAGICIAN",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-022",
        "name": "INTERVENTION | VIPER",
        "weapon": "INTERVENTION",
        "skin": "VIPER",
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
    "id": "demo-023",
    "priceUsd": "57.78",
    "minOfferUsd": "49.11",
    "vaultItem": {
      "id": "demo-vault-demo-023",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "MINT CONDITION",
        "fx": "SHOCK",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-023",
        "name": "AWP | JEWEL",
        "weapon": "AWP",
        "skin": "JEWEL",
        "type": "sniper",
        "crate": "Valentines 2026",
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
    "priceUsd": "41.33",
    "minOfferUsd": "35.13",
    "vaultItem": {
      "id": "demo-vault-demo-024",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "74.28",
    "minOfferUsd": "63.14",
    "vaultItem": {
      "id": "demo-vault-demo-025",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "MINT CONDITION",
        "fx": "ROSEPETALS",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-025",
        "name": "AWP | FRUTIGER AERO",
        "weapon": "AWP",
        "skin": "FRUTIGER AERO",
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
    "id": "demo-026",
    "priceUsd": "47.86",
    "minOfferUsd": "40.68",
    "vaultItem": {
      "id": "demo-vault-demo-026",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-026",
        "name": "INTERVENTION | APEX",
        "weapon": "INTERVENTION",
        "skin": "APEX",
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
    "id": "demo-027",
    "priceUsd": "34.75",
    "minOfferUsd": "29.54",
    "vaultItem": {
      "id": "demo-vault-demo-027",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 1381,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-027",
        "name": "INTERVENTION | BLACK KNIGHT",
        "weapon": "INTERVENTION",
        "skin": "BLACK KNIGHT",
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
    "id": "demo-028",
    "priceUsd": "46.83",
    "minOfferUsd": "39.81",
    "vaultItem": {
      "id": "demo-vault-demo-028",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "STANDARD ISSUE",
        "fx": "INFERNO",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-028",
        "name": "AWP | SHOGUN",
        "weapon": "AWP",
        "skin": "SHOGUN",
        "type": "sniper",
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
    "id": "demo-029",
    "priceUsd": "47.74",
    "minOfferUsd": "40.58",
    "vaultItem": {
      "id": "demo-vault-demo-029",
      "fingerprint": {
        "rarity": "EPIC",
        "condition": "STANDARD ISSUE",
        "fx": "LOVE",
        "fragtrakr": true,
        "fragtrak_type": "NoscopeKills",
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-029",
        "name": "SHOTGUN | EPIC FACE",
        "weapon": "SHOTGUN",
        "skin": "EPIC FACE",
        "type": "sniper",
        "crate": "April Fools 2026",
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
    "priceUsd": "13.20",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-030",
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
        "id": "demo-cat-demo-030",
        "name": "DEFAULT | RING OF FIRE",
        "weapon": "DEFAULT",
        "skin": "RING OF FIRE",
        "type": "sniper",
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
    "id": "demo-031",
    "priceUsd": "9.23",
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
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-031",
        "name": "DEFAULT | PEPPERMINT",
        "weapon": "DEFAULT",
        "skin": "PEPPERMINT",
        "type": "sniper",
        "crate": "Christmas Present 2025",
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
    "priceUsd": "14.86",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-032",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-032",
        "name": "DEFAULT | ABYSS",
        "weapon": "DEFAULT",
        "skin": "ABYSS",
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
    "id": "demo-033",
    "priceUsd": "10.62",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-033",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "NoscopeKills",
        "kills": 394,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-033",
        "name": "DEFAULT | CAULDRON",
        "weapon": "DEFAULT",
        "skin": "CAULDRON",
        "type": "sniper",
        "crate": "Hallows Basket 2025",
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
    "priceUsd": "14.02",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-034",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "MINT CONDITION",
        "fx": "REDMIST",
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
    "priceUsd": "18.66",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-035",
      "fingerprint": {
        "rarity": "RARE",
        "condition": "WELL WORN",
        "fx": "GUY",
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-035",
        "name": "DEFAULT | VAMPIRE HUNTER",
        "weapon": "DEFAULT",
        "skin": "VAMPIRE HUNTER",
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
    "id": "demo-036",
    "priceUsd": "9.08",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-036",
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
        "id": "demo-cat-demo-036",
        "name": "DEFAULT | POLAROID",
        "weapon": "DEFAULT",
        "skin": "POLAROID",
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
    "id": "demo-037",
    "priceUsd": "5.57",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-037",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-037",
        "name": "DEFAULT | PINK CAMO",
        "weapon": "DEFAULT",
        "skin": "PINK CAMO",
        "type": "sniper",
        "crate": "Valentines 2026",
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
    "priceUsd": "2.60",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-038",
      "fingerprint": {
        "rarity": "UNCOMMON",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "HeadshotKills",
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-038",
        "name": "DEFAULT | REINDEER",
        "weapon": "DEFAULT",
        "skin": "REINDEER",
        "type": "sniper",
        "crate": "Christmas Present 2025",
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
    "priceUsd": "2.67",
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
        "name": "DEFAULT | INDUSTRIAL",
        "weapon": "DEFAULT",
        "skin": "INDUSTRIAL",
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
    "id": "demo-040",
    "priceUsd": "3.63",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-040",
      "fingerprint": {
        "rarity": "COMMON",
        "condition": "STANDARD ISSUE",
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
    "priceUsd": "19.21",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-041",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 268,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-041",
        "name": "BUTTERFLY | DAMASCUS",
        "weapon": "BUTTERFLY",
        "skin": "DAMASCUS",
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
    "priceUsd": "24.75",
    "minOfferUsd": "21.04",
    "vaultItem": {
      "id": "demo-vault-demo-042",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 602,
        "festive": false
      },
      "catalog": {
        "id": "demo-cat-demo-042",
        "name": "SURVIVOR | ADURITE",
        "weapon": "SURVIVOR",
        "skin": "ADURITE",
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
    "priceUsd": "58.66",
    "minOfferUsd": "49.86",
    "vaultItem": {
      "id": "demo-vault-demo-043",
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
        "id": "demo-cat-demo-043",
        "name": "SFO TH SWORD | ICE DAGGER",
        "weapon": "SFO TH SWORD",
        "skin": "ICE DAGGER",
        "type": "knife",
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
    "id": "demo-044",
    "priceUsd": "37.94",
    "minOfferUsd": "32.25",
    "vaultItem": {
      "id": "demo-vault-demo-044",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 361,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-044",
        "name": "DEFAULT | DEFAULT OF DESTINY",
        "weapon": "DEFAULT",
        "skin": "DEFAULT OF DESTINY",
        "type": "knife",
        "crate": "April Fools 2026",
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
    "priceUsd": "87.98",
    "minOfferUsd": "74.78",
    "vaultItem": {
      "id": "demo-vault-demo-045",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 781,
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
    "priceUsd": "15.03",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-046",
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
        "id": "demo-cat-demo-046",
        "name": "KATANA | BLACK IRON",
        "weapon": "KATANA",
        "skin": "BLACK IRON",
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
    "priceUsd": "16.60",
    "minOfferUsd": null,
    "vaultItem": {
      "id": "demo-vault-demo-047",
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
        "id": "demo-cat-demo-047",
        "name": "SFO TH SWORD | FIREBRAND",
        "weapon": "SFO TH SWORD",
        "skin": "FIREBRAND",
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
    "priceUsd": "95.42",
    "minOfferUsd": "81.11",
    "vaultItem": {
      "id": "demo-vault-demo-048",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 329,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-048",
        "name": "BUTTERFLY | VELVET",
        "weapon": "BUTTERFLY",
        "skin": "VELVET",
        "type": "knife",
        "crate": "Valentines 2026",
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
    "priceUsd": "97.27",
    "minOfferUsd": "82.68",
    "vaultItem": {
      "id": "demo-vault-demo-049",
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
        "id": "demo-cat-demo-049",
        "name": "BAYONET | CULTIST",
        "weapon": "BAYONET",
        "skin": "CULTIST",
        "type": "knife",
        "crate": "Hallows Basket 2025",
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
    "priceUsd": "63.29",
    "minOfferUsd": "53.80",
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
        "name": "BUTTERFLY | CHERRY",
        "weapon": "BUTTERFLY",
        "skin": "CHERRY",
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
    "priceUsd": "60.27",
    "minOfferUsd": "51.23",
    "vaultItem": {
      "id": "demo-vault-demo-051",
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
        "id": "demo-cat-demo-051",
        "name": "DEFAULT | WANWOOD",
        "weapon": "DEFAULT",
        "skin": "WANWOOD",
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
    "priceUsd": "10.95",
    "minOfferUsd": null,
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
        "name": "SURVIVOR | PEPPERMINT",
        "weapon": "SURVIVOR",
        "skin": "PEPPERMINT",
        "type": "knife",
        "crate": "Christmas Present 2025",
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
    "priceUsd": "22.32",
    "minOfferUsd": "18.97",
    "vaultItem": {
      "id": "demo-vault-demo-053",
      "fingerprint": {
        "rarity": "KNIFE",
        "condition": "WELL WORN",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 0,
        "festive": true
      },
      "catalog": {
        "id": "demo-cat-demo-053",
        "name": "BUTTERFLY | BUTTERFLY OF DESTINY",
        "weapon": "BUTTERFLY",
        "skin": "BUTTERFLY OF DESTINY",
        "type": "knife",
        "crate": "April Fools 2026",
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
    "priceUsd": "38.21",
    "minOfferUsd": "32.48",
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
        "name": "BAYONET | MALACHITE",
        "weapon": "BAYONET",
        "skin": "MALACHITE",
        "type": "knife",
        "crate": "Skin Case #2",
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
    "priceUsd": "92.70",
    "minOfferUsd": "78.80",
    "vaultItem": {
      "id": "demo-vault-demo-055",
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
    "priceUsd": "159.80",
    "minOfferUsd": "135.83",
    "vaultItem": {
      "id": "demo-vault-demo-056",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "LowerBodyKills",
        "kills": 290,
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
    "priceUsd": "158.01",
    "minOfferUsd": "134.31",
    "vaultItem": {
      "id": "demo-vault-demo-057",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "SHOCK",
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
    "priceUsd": "149.69",
    "minOfferUsd": "127.24",
    "vaultItem": {
      "id": "demo-vault-demo-058",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": null,
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 984,
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
    "priceUsd": "184.49",
    "minOfferUsd": "156.82",
    "vaultItem": {
      "id": "demo-vault-demo-059",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "VOIDGRASP",
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
    "priceUsd": "201.83",
    "minOfferUsd": "171.56",
    "vaultItem": {
      "id": "demo-vault-demo-060",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "CRYPTIC",
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
    "priceUsd": "275.65",
    "minOfferUsd": "234.30",
    "vaultItem": {
      "id": "demo-vault-demo-061",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": "DARKCHAINS",
        "fragtrakr": true,
        "fragtrak_type": "LowerBodyKills",
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
    "priceUsd": "116.47",
    "minOfferUsd": "99.00",
    "vaultItem": {
      "id": "demo-vault-demo-062",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": "CERULEANOZYMANDIAS",
        "fragtrakr": true,
        "fragtrak_type": "Kills",
        "kills": 0,
        "festive": false
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
    "priceUsd": "165.15",
    "minOfferUsd": "140.38",
    "vaultItem": {
      "id": "demo-vault-demo-063",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "MINT CONDITION",
        "fx": "LOVE",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
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
    "priceUsd": "159.11",
    "minOfferUsd": "135.24",
    "vaultItem": {
      "id": "demo-vault-demo-064",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "WELL WORN",
        "fx": "NOXNOSTRA",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
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
    "priceUsd": "141.77",
    "minOfferUsd": "120.50",
    "vaultItem": {
      "id": "demo-vault-demo-065",
      "fingerprint": {
        "rarity": "SECRET",
        "condition": "STANDARD ISSUE",
        "fx": "VOIDCRY",
        "fragtrakr": false,
        "fragtrak_type": null,
        "kills": 0,
        "festive": false
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
    "priceUsd": "150.43",
    "minOfferUsd": "127.87",
    "vaultItem": {
      "id": "demo-vault-demo-066",
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
