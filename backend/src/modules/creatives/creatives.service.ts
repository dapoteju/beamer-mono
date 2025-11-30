import { db, pool } from "../../db";
import { creatives, creativeApprovals, campaigns } from "../../db/schema";
import { eq, and } from "drizzle-orm";

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

interface UpdateCreativeInput {
  name?: string;
  status?: CreativeStatus;
  regions_required?: string[];
}

function mapDbCreativeToCreative(dbCreative: typeof creatives.$inferSelect): Creative {
  return {
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
}

export async function getCampaignById(campaignId: string) {
  const result = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  return result[0] || null;
}

export async function getCreativeById(creativeId: string): Promise<Creative | null> {
  const result = await db
    .select()
    .from(creatives)
    .where(eq(creatives.id, creativeId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return mapDbCreativeToCreative(result[0]);
}

export async function listCreativesByCampaign(campaignId: string): Promise<Creative[]> {
  const result = await db
    .select()
    .from(creatives)
    .where(eq(creatives.campaignId, campaignId));

  return result.map(mapDbCreativeToCreative);
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
  const creative = mapDbCreativeToCreative(dbCreative);

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

export async function updateCreative(
  creativeId: string,
  input: UpdateCreativeInput
): Promise<Creative | null> {
  const updateData: Partial<typeof creatives.$inferInsert> = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.regions_required !== undefined) {
    updateData.regionsRequired = input.regions_required;
  }

  if (Object.keys(updateData).length === 0) {
    return getCreativeById(creativeId);
  }

  const result = await db
    .update(creatives)
    .set(updateData)
    .where(eq(creatives.id, creativeId))
    .returning();

  if (result.length === 0) {
    return null;
  }

  return mapDbCreativeToCreative(result[0]);
}

export async function deleteCreative(creativeId: string): Promise<boolean> {
  const result = await db
    .delete(creatives)
    .where(eq(creatives.id, creativeId))
    .returning();

  return result.length > 0;
}

function generateApprovalCode(regionCode: string, uniqueId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const shortId = uniqueId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `${regionCode}-${year}-${shortId}`;
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

  let finalApprovalCode = approvalCode ?? null;

  if (status === 'approved' && !approvalCode) {
    const regionResult = await pool.query(
      `SELECT requires_pre_approval FROM regions WHERE code = $1`,
      [regionCode]
    );
    
    const requiresPreApproval = regionResult.rows[0]?.requires_pre_approval ?? false;
    
    if (requiresPreApproval) {
      finalApprovalCode = generateApprovalCode(regionCode, creativeId);
    }
  }

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
      finalApprovalCode,
      documents ? JSON.stringify(documents) : null,
      approvedByUserId ?? null,
      rejectedReason ?? null,
    ]
  );

  // Auto-sync: When a region approval is set to 'approved', also update the creative's
  // internal QA status to 'approved' (unless it was explicitly rejected).
  // This keeps the QA status in sync with region approvals for better UX.
  if (status === 'approved') {
    await pool.query(
      `
      UPDATE creatives
      SET status = 'approved'
      WHERE id = $1
        AND status != 'rejected'
      `,
      [creativeId]
    );
  }
}

export interface CreativeApprovalResponse {
  id: string;
  creative_id: string;
  region_code: string;
  region_name: string;
  requires_pre_approval: boolean;
  status: CreativeApprovalStatus;
  approval_code: string | null;
  documents: string[];
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
}

export async function getCreativeApprovals(creativeId: string): Promise<CreativeApprovalResponse[]> {
  const result = await pool.query(
    `
    SELECT 
      ca.id,
      ca.creative_id,
      r.code as region_code,
      r.name as region_name,
      r.requires_pre_approval,
      ca.status,
      ca.approval_code,
      ca.documents,
      ca.approved_by_user_id,
      ca.approved_at,
      ca.rejected_reason,
      ca.created_at
    FROM creative_approvals ca
    JOIN regions r ON r.id = ca.region_id
    WHERE ca.creative_id = $1
    ORDER BY r.name ASC
    `,
    [creativeId]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    creative_id: row.creative_id,
    region_code: row.region_code,
    region_name: row.region_name,
    requires_pre_approval: row.requires_pre_approval ?? false,
    status: row.status,
    approval_code: row.approval_code,
    documents: row.documents || [],
    approved_by_user_id: row.approved_by_user_id,
    approved_at: row.approved_at?.toISOString() || null,
    rejected_reason: row.rejected_reason,
    created_at: row.created_at?.toISOString() || new Date().toISOString(),
  }));
}

export interface PendingApprovalResponse {
  id: string;
  region_code: string;
  region_name: string;
  creative_id: string;
  creative_name: string;
  campaign_id: string;
  campaign_name: string;
  advertiser_org_name: string;
  status: CreativeApprovalStatus;
  created_at: string;
}

export async function getPendingApprovals(statusFilter?: string): Promise<PendingApprovalResponse[]> {
  const result = await pool.query(
    `
    SELECT 
      ca.id,
      r.code as region_code,
      r.name as region_name,
      c.id as creative_id,
      c.name as creative_name,
      cmp.id as campaign_id,
      cmp.name as campaign_name,
      org.name as advertiser_org_name,
      ca.status,
      ca.created_at
    FROM creative_approvals ca
    JOIN regions r ON r.id = ca.region_id
    JOIN creatives c ON c.id = ca.creative_id
    JOIN campaigns cmp ON cmp.id = c.campaign_id
    JOIN organisations org ON org.id = cmp.advertiser_org_id
    WHERE ($1::text IS NULL OR ca.status = $1)
    ORDER BY ca.created_at DESC
    `,
    [statusFilter || null]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    region_code: row.region_code,
    region_name: row.region_name,
    creative_id: row.creative_id,
    creative_name: row.creative_name,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    advertiser_org_name: row.advertiser_org_name,
    status: row.status,
    created_at: row.created_at?.toISOString() || new Date().toISOString(),
  }));
}
