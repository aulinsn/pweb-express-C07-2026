import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { RARITIES, isOneOf } from "../utils/enums";
import type { RarityValue } from "../utils/enums";
import { buildMetadata, parseId, parsePagination } from "../utils/parse";
import { sendSuccess } from "../utils/response";

// GET /api/skins?page=1&limit=10&heroId=18&rarity=GRAND
export const getAllSkins = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);

  let heroId: number | undefined;
  if (req.query.heroId !== undefined) {
    heroId = parseId(req.query.heroId, "heroId");
  }

  const rarityQuery = req.query.rarity;
  let rarity: RarityValue | undefined;
  if (rarityQuery !== undefined) {
    if (!isOneOf(RARITIES, rarityQuery)) {
      throw new HttpError(400, `rarity harus salah satu dari: ${RARITIES.join(", ")}`);
    }
    rarity = rarityQuery;
  }

  const where = {
    ...(heroId !== undefined ? { heroId } : {}),
    ...(rarity ? { rarity } : {}),
  };

  const [skins, total] = await prisma.$transaction([
    prisma.skin.findMany({
      where,
      include: { hero: { select: { name: true } } },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.skin.count({ where }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil data skin", skins, buildMetadata(page, limit, total));
};

// GET /api/skins/:skin_id
export const getSkinById = async (req: Request, res: Response) => {
  const id = parseId(req.params.skin_id, "skin_id");

  const skin = await prisma.skin.findUnique({
    where: { id },
    include: { hero: { select: { id: true, name: true } } },
  });
  if (!skin) throw new HttpError(404, "Skin tidak ditemukan");

  sendSuccess(res, 200, "Berhasil mengambil detail skin", skin);
};