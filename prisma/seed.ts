import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import prisma from "../src/config/prisma";
import type { Lane, Rarity, Role } from "../src/generated/prisma/client";

type Row = Record<string, string>;

const readCsv = (file: string): Row[] =>
  parse(readFileSync(resolve(process.cwd(), "Mlbb-Dataset", file), "utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  });

// Sel kosong di CSV -> null
const toIntOrNull = (value: string): number | null =>
  value === "" ? null : Number(value);

async function main() {
  const heroes = readCsv("heroes.csv");
  const skins = readCsv("skins.csv");

  // 1. Kosongkan semua tabel dan kembalikan id ke 1
  await prisma.$executeRaw`TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE`;

  // 2. Hero (id otomatis: Miya = 1, Hirara = 133)
  await prisma.hero.createMany({
    data: heroes.map((h) => ({
      name: h.name,
      role: h.primaryRole as Role,
      lane: h.primaryLane as Lane,
      releaseYear: Number(h.releaseYear),
      priceBP: toIntOrNull(h.priceBP),
      priceDiamond: toIntOrNull(h.priceDiamond),
    })),
  });

  // 3. Skin
  await prisma.skin.createMany({
    data: skins.map((s) => ({
      name: s.name,
      heroId: Number(s.heroId),
      rarity: s.rarity as Rarity,
      priceDiamond: toIntOrNull(s.priceDiamond),
    })),
  });

  // 4. Player dan PlayerHero
  await prisma.player.createMany({
    data: [
      { nickname: "ArekITS", bp: 1500, diamond: 75 },
      { nickname: "SangPushRank", bp: 13000, diamond: 2892 },
      { nickname: "MageSurabaya", bp: 10000, diamond: 0 },
    ],
  });

  await prisma.playerHero.createMany({
    data: [
      { playerId: 1, heroId: 18, currency: "BP", pricePaid: 2000 },
      { playerId: 1, heroId: 1, currency: "BP", pricePaid: 10800 },
      { playerId: 2, heroId: 84, currency: "DIAMOND", pricePaid: 599 },
      { playerId: 2, heroId: 56, currency: "BP", pricePaid: 32000 },
    ],
  });

  // Pengecekan sederhana
  const [heroCount, skinCount, playerCount, layla] = await Promise.all([
    prisma.hero.count(),
    prisma.skin.count(),
    prisma.player.count(),
    prisma.hero.findUnique({ where: { id: 18 } }),
  ]);
  console.log({ heroCount, skinCount, playerCount, hero18: layla?.name });

  if (layla?.name !== "Layla") {
    throw new Error("Id hero tidak sesuai urutan file (hero id 18 seharusnya Layla)");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());