import type { Request } from "express";
import { HttpError } from "./http-error";

// Tolak yang bukan bilangan bulat positif
export const parseId = (value: unknown, label = "ID"): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${label} harus berupa bilangan bulat positif`);
  }
  return id;
};

// Baca ?page= dan ?limit= (default page=1, limit=10, maksimal 100)
export const parsePagination = (query: Request["query"]) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const buildMetadata = (page: number, limit: number, total: number) => ({
  currentPage: page,
  limit,
  totalItems: total,
  totalPages: Math.ceil(total / limit),
});

// Nilai dianggap "tidak diisi" kalau undefined, null, atau string kosong
export const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

// Harga opsional: boleh kosong (jadi null), kalau diisi harus bilangan bulat >= 0
export const parseOptionalPrice = (value: unknown, field: string): number | null => {
  if (isEmpty(value)) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new HttpError(400, `${field} harus berupa bilangan bulat >= 0 atau dikosongkan`);
  }
  return value;
};