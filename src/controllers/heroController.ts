import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { LANES, ROLES, isOneOf } from "../utils/enums";
import type { RoleValue } from "../utils/enums";
import {
  buildMetadata,
  isEmpty,
  parseId,
  parseOptionalPrice,
  parsePagination,
} from "../utils/parse";
import { sendSuccess } from "../utils/response";

// GET /api/heroes?page=1&limit=10&search=la&role=MARKSMAN
export const getAllHeroes = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const roleQuery = req.query.role;
  let role: RoleValue | undefined;
  if (roleQuery !== undefined) {
    if (!isOneOf(ROLES, roleQuery)) {
      throw new HttpError(400, `role harus salah satu dari: ${ROLES.join(", ")}`);
    }
    role = roleQuery;
  }

  const where = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(role ? { role } : {}),
  };

  const [heroes, total] = await prisma.$transaction([
    prisma.hero.findMany({ where, orderBy: { id: "asc" }, skip, take: limit }),
    prisma.hero.count({ where }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil data hero", heroes, buildMetadata(page, limit, total));
};

// GET /api/heroes/:hero_id  (beserta daftar skin)
export const getHeroById = async (req: Request, res: Response) => {
  const id = parseId(req.params.hero_id, "hero_id");

  const hero = await prisma.hero.findUnique({
    where: { id },
    include: { skins: { orderBy: { id: "asc" } } },
  });
  if (!hero) throw new HttpError(404, "Hero tidak ditemukan");

  sendSuccess(res, 200, "Berhasil mengambil detail hero", hero);
};

// POST /api/heroes
export const createHero = async (req: Request, res: Response) => {
  const { name, role, lane, releaseYear, priceBP, priceDiamond } = req.body ?? {};

  // 1. Field wajib -> 400
  if (isEmpty(name) || isEmpty(role) || isEmpty(lane) || isEmpty(releaseYear)) {
    throw new HttpError(400, "name, role, lane, dan releaseYear wajib diisi");
  }
  if (typeof name !== "string") {
    throw new HttpError(400, "name harus berupa teks");
  }
  if (!isOneOf(ROLES, role)) {
    throw new HttpError(400, `role harus salah satu dari: ${ROLES.join(", ")}`);
  }
  if (!isOneOf(LANES, lane)) {
    throw new HttpError(400, `lane harus salah satu dari: ${LANES.join(", ")}`);
  }
  if (!Number.isInteger(releaseYear)) {
    throw new HttpError(400, "releaseYear harus berupa bilangan bulat");
  }
  const bp = parseOptionalPrice(priceBP, "priceBP");
  const diamond = parseOptionalPrice(priceDiamond, "priceDiamond");

  // 2. Nama sudah ada -> 409
  const heroName = name.trim();
  const existing = await prisma.hero.findUnique({ where: { name: heroName } });
  if (existing) {
    throw new HttpError(409, `Hero dengan nama ${heroName} sudah ada`);
  }

  // 3. Berhasil -> 201
  const hero = await prisma.hero.create({
    data: { name: heroName, role, lane, releaseYear, priceBP: bp, priceDiamond: diamond },
  });

  sendSuccess(res, 201, "Hero berhasil dibuat", hero);
};