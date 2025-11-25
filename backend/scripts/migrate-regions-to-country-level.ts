import "dotenv/config";
import { db, pool } from "../src/db";
import { regions, screens, creatives, campaigns, creativeApprovals } from "../src/db/schema";
import { eq, like, sql } from "drizzle-orm";

const COUNTRY_LEVEL_REGIONS = [
  { name: "Nigeria", code: "NG", regulatorName: "ARCON", requiresPreApproval: true },
  { name: "Kenya", code: "KE", regulatorName: "KFCB", requiresPreApproval: true },
  { name: "Ghana", code: "GH", regulatorName: "GACA", requiresPreApproval: false },
  { name: "South Africa", code: "ZA", regulatorName: "AR", requiresPreApproval: false },
];

interface MigrationCounts {
  stateRegionsDeleted: number;
  countryRegionsInserted: number;
  screensUpdated: number;
  creativesUpdated: number;
  campaignsUpdated: number;
  creativeApprovalsDeleted: number;
}

async function migrateRegionsToCountryLevel(): Promise<MigrationCounts> {
  console.log("🌍 Starting region migration to country-level...\n");

  const counts: MigrationCounts = {
    stateRegionsDeleted: 0,
    countryRegionsInserted: 0,
    screensUpdated: 0,
    creativesUpdated: 0,
    campaignsUpdated: 0,
    creativeApprovalsDeleted: 0,
  };

  const stateRegions = await db.select().from(regions).where(like(regions.code, "%-__%"));
  console.log(`Found ${stateRegions.length} state-level region(s) to migrate:`);
  stateRegions.forEach(r => console.log(`  - ${r.code}: ${r.name}`));

  console.log("\n📺 Updating screens with state-level region codes...");
  const screensWithStateRegions = await db
    .select({ id: screens.id, code: screens.code, regionCode: screens.regionCode })
    .from(screens)
    .where(like(screens.regionCode, "%-__%"));
  
  for (const screen of screensWithStateRegions) {
    const countryCode = screen.regionCode?.split("-")[0] || "NG";
    await db.update(screens)
      .set({ regionCode: countryCode })
      .where(eq(screens.id, screen.id));
    counts.screensUpdated++;
    console.log(`  Updated screen ${screen.code}: ${screen.regionCode} -> ${countryCode}`);
  }

  console.log("\n🎨 Updating creatives with state-level region codes...");
  const allCreatives = await db.select({ 
    id: creatives.id, 
    name: creatives.name, 
    regionsRequired: creatives.regionsRequired,
    campaignId: creatives.campaignId,
  }).from(creatives);

  for (const creative of allCreatives) {
    const currentRegions = creative.regionsRequired || [];
    const hasStateLevel = currentRegions.some(r => r.includes("-"));
    
    if (hasStateLevel) {
      const countryRegions = [...new Set(
        currentRegions.map(r => r.includes("-") ? r.split("-")[0] : r)
      )];
      
      await db.update(creatives)
        .set({ regionsRequired: countryRegions })
        .where(eq(creatives.id, creative.id));
      counts.creativesUpdated++;
      console.log(`  Updated creative "${creative.name}": [${currentRegions.join(", ")}] -> [${countryRegions.join(", ")}]`);
    }
  }

  console.log("\n📋 Updating campaign targeting JSON...");
  const allCampaigns = await db.select({
    id: campaigns.id,
    name: campaigns.name,
    targetingJson: campaigns.targetingJson,
  }).from(campaigns);

  for (const campaign of allCampaigns) {
    const targeting = campaign.targetingJson as any;
    if (targeting && targeting.regions) {
      const hasStateLevel = targeting.regions.some((r: string) => r.includes("-"));
      if (hasStateLevel) {
        const countryRegions = [...new Set(
          targeting.regions.map((r: string) => r.includes("-") ? r.split("-")[0] : r)
        )];
        
        const updatedTargeting = { ...targeting, regions: countryRegions };
        await db.update(campaigns)
          .set({ targetingJson: updatedTargeting })
          .where(eq(campaigns.id, campaign.id));
        counts.campaignsUpdated++;
        console.log(`  Updated campaign "${campaign.name}": regions [${targeting.regions.join(", ")}] -> [${countryRegions.join(", ")}]`);
      }
    }
  }

  console.log("\n🗑️ Deleting creative approvals for state-level regions...");
  for (const stateRegion of stateRegions) {
    const deleteResult = await pool.query(
      `DELETE FROM creative_approvals WHERE region_id = $1 RETURNING id`,
      [stateRegion.id]
    );
    counts.creativeApprovalsDeleted += deleteResult.rowCount || 0;
    if (deleteResult.rowCount && deleteResult.rowCount > 0) {
      console.log(`  Deleted ${deleteResult.rowCount} creative approval(s) for region ${stateRegion.code}`);
    }
  }

  console.log("\n🗑️ Deleting state-level regions...");
  for (const stateRegion of stateRegions) {
    await db.delete(regions).where(eq(regions.id, stateRegion.id));
    counts.stateRegionsDeleted++;
    console.log(`  Deleted region: ${stateRegion.code} (${stateRegion.name})`);
  }

  console.log("\n✨ Inserting country-level regions...");
  for (const region of COUNTRY_LEVEL_REGIONS) {
    const existing = await db.select().from(regions).where(eq(regions.code, region.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(regions).values(region);
      counts.countryRegionsInserted++;
      console.log(`  Inserted region: ${region.code} (${region.name})`);
    } else {
      console.log(`  Region already exists: ${region.code} (${region.name})`);
    }
  }

  return counts;
}

async function printFinalState() {
  console.log("\n📊 Final State:");
  console.log("================\n");

  console.log("✅ GET /api/regions will now return:");
  const finalRegions = await db.select().from(regions);
  finalRegions.forEach(r => {
    console.log(`  - ${r.name} (${r.code}) - Regulator: ${r.regulatorName}, Pre-approval: ${r.requiresPreApproval}`);
  });

  const screensWithRegions = await db
    .select({ id: screens.id, regionCode: screens.regionCode })
    .from(screens);
  const screenRegionCodes = [...new Set(screensWithRegions.map(s => s.regionCode))];
  console.log(`\n📺 Screen region codes in use: [${screenRegionCodes.join(", ")}]`);

  const allCreatives = await db.select({ regionsRequired: creatives.regionsRequired }).from(creatives);
  const allCreativeRegions = [...new Set(allCreatives.flatMap(c => c.regionsRequired || []))];
  console.log(`\n🎨 Creative region codes in use: [${allCreativeRegions.join(", ")}]`);

  const allCampaigns = await db.select({ targetingJson: campaigns.targetingJson }).from(campaigns);
  const allCampaignRegions = [...new Set(
    allCampaigns
      .filter(c => c.targetingJson && (c.targetingJson as any).regions)
      .flatMap(c => (c.targetingJson as any).regions)
  )];
  console.log(`\n📋 Campaign targeting region codes in use: [${allCampaignRegions.join(", ")}]`);
}

async function main() {
  try {
    const counts = await migrateRegionsToCountryLevel();

    console.log("\n" + "=".repeat(60));
    console.log("✅ MIGRATION COMPLETE");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`  - State-level regions deleted: ${counts.stateRegionsDeleted}`);
    console.log(`  - Country-level regions inserted: ${counts.countryRegionsInserted}`);
    console.log(`  - Screens updated: ${counts.screensUpdated}`);
    console.log(`  - Creatives updated: ${counts.creativesUpdated}`);
    console.log(`  - Campaigns updated: ${counts.campaignsUpdated}`);
    console.log(`  - Creative approvals deleted: ${counts.creativeApprovalsDeleted}`);

    await printFinalState();

    console.log("\n🎉 Region migration to country-level completed successfully!");
    console.log("   The CMS dropdown will now show: Nigeria (NG), Kenya (KE), Ghana (GH), South Africa (ZA)");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
