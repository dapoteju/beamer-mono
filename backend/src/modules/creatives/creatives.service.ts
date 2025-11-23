// src/modules/creatives/creatives.service.ts
import { db, pool } from "../../db";
import { creatives, creativeApprovals } from "../../db/schema";
import { sql } from "drizzle-orm";

export type CreativeStatus = "pending_review" | "approved" | "rejected";
export type CreativeApprovalStatus = "pending" | "approved" | "rejected";

export interface Creative {
  id: string;
  campaign_id: string;
  name: string;
  file_url: string;
  mime_type: string;
  duration_seconds: number;
  width: number;
  height: number;
  status: CreativeStatus;
  regions_required: string[];
  created_at: string;
}

interface CreateCreativeInput {
  campaign_id: string;
  name: string;
  file_url: string;
  mime_type: string;
  duration_seconds: number;
  width: number;
  height: number;
  regions: string[];
}

export async function createCreative(input: CreateCreativeInput): Promise<Creative> {
  const id = crypto.randomUUID();
  const status: CreativeStatus = "pending_review";

  const result = await db.insert(creatives).values({
    id,
    campaignId: input.campaign_id,
    name: input.name,
    fileUrl: input.file_url,
    mimeType: input.mime_type,
    durationSeconds: input.duration_seconds,
    width: input.width,
    height: input.height,
    status,
    regionsRequired: input.regions,
  }).returning();

  const dbCreative = result[0];

  const creative: Creative = {
    id: dbCreative.id,
    campaign_id: dbCreative.campaignId,
    name: dbCreative.name,
    file_url: dbCreative.fileUrl,
    mime_type: dbCreative.mimeType,
    duration_seconds: dbCreative.durationSeconds,
    width: dbCreative.width,
    height: dbCreative.height,
    status: dbCreative.status as CreativeStatus,
    regions_required: dbCreative.regionsRequired,
    created_at: dbCreative.createdAt?.toISOString() || new Date().toISOString(),
  };

  await pool.query(
    `
    INSERT INTO creative_approvals (id, creative_id, region_id, status, created_at)
    SELECT gen_random_uuid(), $1, r.id, 'pending', NOW()
    FROM regions r
    WHERE r.code = ANY($2::text[])
    `,
    [creative.id, input.regions]
  ).catch((err) => {
    console.error("Failed to seed creative_approvals", err);
  });

  return creative;
}

export async function setCreativeApproval(params: {
  creativeId: string;
  regionCode: string;
  status: CreativeApprovalStatus;
  approvalCode?: string;
  documents?: string[];
  rejectedReason?: string;
  approvedByUserId?: string;
}): Promise<void> {
  const {
    creativeId,
    regionCode,
    status,
    approvalCode,
    documents,
    rejectedReason,
    approvedByUserId,
  } = params;

  await pool.query(
    `
    INSERT INTO creative_approvals
      (id, creative_id, region_id, status, approval_code, documents,
       approved_by_user_id, approved_at, rejected_reason, created_at)
    VALUES (
      gen_random_uuid(),
      $1,
      (SELECT id FROM regions WHERE code = $2),
      $3,
      $4,
      $5,
      $6,
      CASE WHEN $3 = 'approved' THEN NOW() ELSE NULL END,
      $7,
      NOW()
    )
    ON CONFLICT (creative_id, region_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      approval_code = EXCLUDED.approval_code,
      documents = EXCLUDED.documents,
      approved_by_user_id = EXCLUDED.approved_by_user_id,
      approved_at = EXCLUDED.approved_at,
      rejected_reason = EXCLUDED.rejected_reason
    `,
    [
      creativeId,
      regionCode,
      status,
      approvalCode ?? null,
      documents ? JSON.stringify(documents) : null,
      approvedByUserId ?? null,
      rejectedReason ?? null,
    ]
  );
}
