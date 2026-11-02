import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { sendSuccess } from "../utils/response";

// GET /api/statistics
export const getStatistics = async (_req: Request, res: Response) => {
  const [totalPlayers, totalHeroesOwned, diamondSum, ownedGroups, roleGroups] =
    await Promise.all([
      prisma.player.count(),
      prisma.playerHero.count(),
      prisma.player.aggregate({ _sum: { diamond: true } }),
      // Hero yang paling banyak dimiliki (kalau seri, ambil id terkecil)
      prisma.playerHero.groupBy({
        by: ["heroId"],
        _count: { heroId: true },
        orderBy: [{ _count: { heroId: "desc" } }, { heroId: "asc" }],
        take: 1,
      }),
      // Jumlah hero per role (terbanyak dulu)
      prisma.hero.groupBy({
        by: ["role"],
        _count: { role: true },
        orderBy: [{ _count: { role: "desc" } }, { role: "asc" }],
      }),
    ]);

  // Ambil nama hero untuk mostOwnedHero (null kalau belum ada yang punya hero)
  let mostOwnedHero: { heroId: number; name: string | null; owners: number } | null = null;
  const top = ownedGroups[0];
  if (top) {
    const hero = await prisma.hero.findUnique({
      where: { id: top.heroId },
      select: { name: true },
    });
    mostOwnedHero = {
      heroId: top.heroId,
      name: hero?.name ?? null,
      owners: top._count.heroId,
    };
  }

  sendSuccess(res, 200, "Berhasil mengambil statistik", {
    totalPlayers,
    totalHeroesOwned,
    totalDiamond: diamondSum._sum.diamond ?? 0,
    mostOwnedHero,
    heroesPerRole: roleGroups.map((r) => ({ role: r.role, total: r._count.role })),
  });
};