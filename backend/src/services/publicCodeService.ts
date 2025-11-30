import { db } from "../db/client";
import { publisherProfiles, organisations } from "../db/schema";
import { sql, and, eq, like } from "drizzle-orm";

export async function generatePublisherCode(): Promise<string> {
  const result = await db.execute<{ max_num: number }>(sql`
    SELECT COALESCE(MAX(CAST(SUBSTRING(public_code FROM 5) AS INTEGER)), 0) AS max_num
    FROM publisher_profiles
    WHERE public_code LIKE 'PUB-%'
  `);

  const nextNum = (result.rows[0]?.max_num || 0) + 1;
  return `PUB-${nextNum.toString().padStart(5, '0')}`;
}

export async function generateAdvertiserCode(): Promise<string> {
  const result = await db.execute<{ max_num: number }>(sql`
    SELECT COALESCE(MAX(CAST(SUBSTRING(public_code FROM 5) AS INTEGER)), 0) AS max_num
    FROM organisations
    WHERE public_code LIKE 'ADV-%' AND organisation_category = 'advertiser'
  `);

  const nextNum = (result.rows[0]?.max_num || 0) + 1;
  return `ADV-${nextNum.toString().padStart(5, '0')}`;
}

export async function generateOrganisationCode(orgCategory: 'publisher' | 'advertiser' | 'beamer_internal'): Promise<string> {
  if (orgCategory === 'publisher') {
    const result = await db.execute<{ max_num: number }>(sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING(public_code FROM 9) AS INTEGER)), 0) AS max_num
      FROM organisations
      WHERE public_code LIKE 'ORG-PUB-%' AND organisation_category = 'publisher'
    `);

    const nextNum = (result.rows[0]?.max_num || 0) + 1;
    return `ORG-PUB-${nextNum.toString().padStart(5, '0')}`;
  } else if (orgCategory === 'advertiser') {
    return generateAdvertiserCode();
  } else {
    const result = await db.execute<{ max_num: number }>(sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING(public_code FROM 9) AS INTEGER)), 0) AS max_num
      FROM organisations
      WHERE public_code LIKE 'ORG-INT-%' AND organisation_category = 'beamer_internal'
    `);

    const nextNum = (result.rows[0]?.max_num || 0) + 1;
    return `ORG-INT-${nextNum.toString().padStart(5, '0')}`;
  }
}
