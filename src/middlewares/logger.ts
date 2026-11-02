import type { NextFunction, Request, Response } from "express";

// GET /api/heroes 200 misal
export const logger = (req: Request, res: Response, next: NextFunction): void => {
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode}`);
  });
  next();
};