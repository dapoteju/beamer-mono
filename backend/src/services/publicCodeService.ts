import { db } from "../db/client";
import { publisherProfiles, organisations } from "../db/schema";
import { sql, eq, like, desc } from "drizzle-orm";

export async function generatePublisherCode(): Promise<string> {
  const [result] = await db
    .select({ publicCode: publisherProfiles.publicCode })
    .from(publisherProfiles)
    .where(like(publisherProfiles.publicCode, 'PUB-%'))
    .orderBy(desc(publisherProfiles.publicCode))
    .limit(1);

  let nextNum = 1;
  if (result?.publicCode) {
    const match = result.publicCode.match(/PUB-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `PUB-${nextNum.toString().padStart(5, '0')}`;
}

export async function generateAdvertiserCode(): Promise<string> {
  const [result] = await db
    .select({ publicCode: organisations.publicCode })
    .from(organisations)
    .where(like(organisations.publicCode, 'ADV-%'))
    .orderBy(desc(organisations.publicCode))
    .limit(1);

  let nextNum = 1;
  if (result?.publicCode) {
    const match = result.publicCode.match(/ADV-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `ADV-${nextNum.toString().padStart(5, '0')}`;
}

export async function generateOrganisationCode(orgCategory: 'publisher' | 'advertiser' | 'beamer_internal'): Promise<string> {
  if (orgCategory === 'publisher') {
    const prefix = 'ORG-PUB-';
    const [result] = await db
      .select({ publicCode: organisations.publicCode })
      .from(organisations)
      .where(like(organisations.publicCode, `${prefix}%`))
      .orderBy(desc(organisations.publicCode))
      .limit(1);

    let nextNum = 1;
    if (result?.publicCode) {
      const match = result.publicCode.match(/ORG-PUB-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${nextNum.toString().padStart(5, '0')}`;
  } else if (orgCategory === 'advertiser') {
    return generateAdvertiserCode();
  } else {
    const prefix = 'ORG-INT-';
    const [result] = await db
      .select({ publicCode: organisations.publicCode })
      .from(organisations)
      .where(like(organisations.publicCode, `${prefix}%`))
      .orderBy(desc(organisations.publicCode))
      .limit(1);

    let nextNum = 1;
    if (result?.publicCode) {
      const match = result.publicCode.match(/ORG-INT-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${nextNum.toString().padStart(5, '0')}`;
  }
}
