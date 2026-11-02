import { Router } from "express";
import {
  createPlayer,
  deletePlayer,
  getPlayerById,
  updatePlayer,
} from "../controllers/playerController";
import { buyHero, createMatch, topUp } from "../controllers/transactionController";

const router = Router();

router.post("/", createPlayer);
router.get("/:player_id", getPlayerById);
router.patch("/:player_id", updatePlayer);
router.delete("/:player_id", deletePlayer);

router.post("/:player_id/topup", topUp);
router.post("/:player_id/matches", createMatch);
router.post("/:player_id/heroes", buyHero);

export default router;