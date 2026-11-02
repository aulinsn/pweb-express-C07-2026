// Daftar nilai enum , validasi input
export const ROLES = ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"] as const;
export const LANES = ["EXP", "GOLD", "MID", "JUNGLE", "ROAM"] as const;
export const RARITIES = ["COMMON", "EXCEPTIONAL", "DELUXE", "EXQUISITE", "GRAND", "SUPREME"] as const;
export const CURRENCIES = ["BP", "DIAMOND"] as const;

export type RoleValue = (typeof ROLES)[number];
export type RarityValue = (typeof RARITIES)[number];

// Cek value ada di dalam daftar or no
export const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);