import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

// nickname wajib berupa teks tidak kosong
const parseNickname = (value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, "nickname wajib diisi");
  }
  return value.trim();
};

// POST /api/players
export const createPlayer = async (req: Request, res: Response) => {
  const nickname = parseNickname(req.body?.nickname);

  const existing = await prisma.player.findUnique({ where: { nickname } });
  if (existing) {
    throw new HttpError(409, `Nickname ${nickname} sudah dipakai`);
  }

  // bp (10000) dan diamond (0) terisi otomatis dari default di schema
  const player = await prisma.player.create({ data: { nickname } });

  sendSuccess(res, 201, "Player berhasil dibuat", player);
};

// GET /api/players/:player_id  (beserta daftar hero miliknya)
export const getPlayerById = async (req: Request, res: Response) => {
  const id = parseId(req.params.player_id, "player_id");

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      heroes: {
        include: { hero: { select: { name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!player) throw new HttpError(404, "Player tidak ditemukan");

  // Ringkas bentuk heroes: { heroId, name, currency, pricePaid }
  const { heroes, ...playerData } = player;

  sendSuccess(res, 200, "Berhasil mengambil data player", {
    ...playerData,
    heroes: heroes.map((ph) => ({
      heroId: ph.heroId,
      name: ph.hero.name,
      currency: ph.currency,
      pricePaid: ph.pricePaid,
    })),
  });
};

// PATCH /api/players/:player_id  (ganti nickname)
export const updatePlayer = async (req: Request, res: Response) => {
  const id = parseId(req.params.player_id, "player_id");

  // Urutan sesuai soal: 404 -> 400 -> 409
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) throw new HttpError(404, "Player tidak ditemukan");

  const nickname = parseNickname(req.body?.nickname);

  const taken = await prisma.player.findUnique({ where: { nickname } });
  if (taken && taken.id !== id) {
    throw new HttpError(409, `Nickname ${nickname} sudah dipakai player lain`);
  }

  const updated = await prisma.player.update({ where: { id }, data: { nickname } });

  sendSuccess(res, 200, "Player berhasil diupdate", updated);
};

// DELETE /api/players/:player_id
export const deletePlayer = async (req: Request, res: Response) => {
  const id = parseId(req.params.player_id, "player_id");

  const player = await prisma.player.findUnique({ where: { id }, select: { id: true } });
  if (!player) throw new HttpError(404, "Player tidak ditemukan");

  await prisma.player.delete({ where: { id } });

  sendSuccess(res, 200, "Player berhasil dihapus");
};