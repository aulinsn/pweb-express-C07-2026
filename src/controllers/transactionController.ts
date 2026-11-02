import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { CURRENCIES, isOneOf } from "../utils/enums";
import { HttpError } from "../utils/http-error";
import { isEmpty, parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

const MATCH_RESULTS = ["WIN", "LOSE"] as const;
const MATCH_REWARD = { WIN: 300, LOSE: 100 } as const;

// POST /api/players/:player_id/topup   body: { "amount": 706 }
export const topUp = async (req: Request, res: Response) => {
  const id = parseId(req.params.player_id, "player_id");
  const { amount } = req.body ?? {};

  // 1. amount bukan bilangan bulat > 0 -> 400
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    throw new HttpError(400, "amount harus berupa bilangan bulat lebih dari 0");
  }

  // 2. Player tidak ada -> 404
  const player = await prisma.player.findUnique({ where: { id }, select: { id: true } });
  if (!player) throw new HttpError(404, "Player tidak ditemukan");

  // 3. Tambah diamond dengan increment
  const updated = await prisma.player.update({
    where: { id },
    data: { diamond: { increment: amount } },
    select: { diamond: true },
  });

  sendSuccess(res, 200, "Top up berhasil", {
    playerId: id,
    amount,
    diamond: updated.diamond,
  });
};

// POST /api/players/:player_id/matches   body: { "result": "WIN" }
export const createMatch = async (req: Request, res: Response) => {
  const id = parseId(req.params.player_id, "player_id");
  const { result } = req.body ?? {};

  // 1. result bukan WIN/LOSE -> 400
  if (!isOneOf(MATCH_RESULTS, result)) {
    throw new HttpError(400, "result harus berupa WIN atau LOSE");
  }

  // 2. Player tidak ada -> 404
  const player = await prisma.player.findUnique({ where: { id }, select: { id: true } });
  if (!player) throw new HttpError(404, "Player tidak ditemukan");

  // 3. Tambah BP dengan increment (WIN 300, LOSE 100)
  const bpEarned = MATCH_REWARD[result];
  const updated = await prisma.player.update({
    where: { id },
    data: { bp: { increment: bpEarned } },
    select: { bp: true },
  });

  sendSuccess(res, 200, "Hadiah match berhasil ditambahkan", {
    playerId: id,
    result,
    bpEarned,
    bp: updated.bp,
  });
};

// POST /api/players/:player_id/heroes   body: { "heroId": 22, "currency": "DIAMOND" }
export const buyHero = async (req: Request, res: Response) => {
  const playerId = parseId(req.params.player_id, "player_id");
  const { heroId, currency } = req.body ?? {};

  // 1. heroId kosong, atau currency bukan BP/DIAMOND -> 400
  if (isEmpty(heroId) || !isOneOf(CURRENCIES, currency)) {
    throw new HttpError(400, "heroId wajib diisi dan currency harus BP atau DIAMOND");
  }
  if (typeof heroId !== "number" || !Number.isInteger(heroId) || heroId <= 0) {
    throw new HttpError(400, "heroId harus berupa bilangan bulat positif");
  }

  // 2. Player tidak ditemukan -> 404
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, bp: true, diamond: true },
  });
  if (!player) throw new HttpError(404, "Player tidak ditemukan");

  // 3. Hero tidak ditemukan -> 404
  const hero = await prisma.hero.findUnique({ where: { id: heroId } });
  if (!hero) throw new HttpError(404, "Hero tidak ditemukan");

  // 4. Harga untuk currency itu kosong (null) -> 400
  const price = currency === "BP" ? hero.priceBP : hero.priceDiamond;
  if (price === null) {
    throw new HttpError(400, `Hero ${hero.name} tidak bisa dibeli dengan ${currency}`);
  }

  // 5. Player sudah memiliki hero itu -> 409
  const owned = await prisma.playerHero.findUnique({
    where: { playerId_heroId: { playerId, heroId } },
  });
  if (owned) {
    throw new HttpError(409, `Player sudah memiliki hero ${hero.name}`);
  }

  // 6. Saldo kurang dari harga -> 400
  const balance = currency === "BP" ? player.bp : player.diamond;
  if (balance < price) {
    throw new HttpError(400, `Saldo ${currency} tidak cukup (saldo ${balance}, harga ${price})`);
  }

  // Dua query ini berhasil bersama atau gagal bersama
  const [updatedPlayer] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: currency === "BP" ? { bp: { decrement: price } } : { diamond: { decrement: price } },
      select: { bp: true, diamond: true },
    }),
    prisma.playerHero.create({
      data: { playerId, heroId, currency, pricePaid: price },
    }),
  ]);

  sendSuccess(res, 201, "Hero berhasil dibeli", {
    hero: { id: hero.id, name: hero.name },
    currency,
    pricePaid: price,
    balance: { bp: updatedPlayer.bp, diamond: updatedPlayer.diamond },
  });
};