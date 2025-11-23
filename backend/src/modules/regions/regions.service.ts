import { db } from "../../db";
import { regions } from "../../db/schema";
import { eq, asc } from "drizzle-orm";

export const RegionsService = {
  async getAll() {
    const result = await db.select().from(regions).orderBy(asc(regions.name));
    return result;
  },

  async getByCode(code: string) {
    const result = await db.select().from(regions).where(eq(regions.code, code));
    return result[0] || null;
  }
};
