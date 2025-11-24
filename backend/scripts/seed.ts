import "dotenv/config";
import { db } from "../src/db/client";
import {
  organisations,
  users,
  publisherProfiles,
  vehicles,
  screens,
  screenGroups,
  screenGroupMembers,
  campaigns,
  bookings,
  flights,
  creatives,
  regions,
  players,
  heartbeats,
  playEvents,
  bookingFlights,
  screenLocationHistory,
} from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import { createHash } from "crypto";

const SALT_ROUNDS = 10;

// Generate deterministic UUID v5-style from a name (for human-friendly seed data)
function deterministicUUID(name: string): string {
  const hash = createHash('sha256').update(name).digest('hex');
  
  // Format as UUID v5: xxxxxxxx-xxxx-5xxx-Yxxx-xxxxxxxxxxxx
  // where Y is 8, 9, a, or b (variant bits for RFC 4122)
  
  // Take first 32 hex chars and format as UUID
  const uuid = [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32),
  ].join('-');
  
  // Set version to 5 (replace char at index 14)
  // Set variant to RFC 4122 (replace char at index 19 with 8, 9, a, or b)
  const variantChar = ['8', '9', 'a', 'b'][parseInt(hash[16], 16) % 4];
  
  return uuid.substring(0, 14) + '5' + uuid.substring(15, 19) + variantChar + uuid.substring(20);
}

// Safety check: prevent accidental production seeding
function checkEnvironment() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_DEMO !== "true") {
    throw new Error(
      "❌ Cannot seed data in production environment. Set ALLOW_SEED_DEMO=true to override."
    );
  }
}

// Track counts for final summary
const counts = {
  organisations: 0,
  users: 0,
  publisherProfiles: 0,
  vehicles: 0,
  screens: 0,
  screenGroups: 0,
  campaigns: 0,
  bookings: 0,
  flights: 0,
  creatives: 0,
  regions: 0,
  players: 0,
  heartbeats: 0,
  playEvents: 0,
  screenLocationHistory: 0,
};

// Helper: Generate dates relative to now
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper: Random number between min and max
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Random element from array
function randomFrom<T>(arr: T[]): T {
  return arr[randomBetween(0, arr.length - 1)];
}

// =====================================================
// 1. ORGANISATIONS & USERS
// =====================================================

async function seedOrganisationsAndUsers() {
  console.log("\n🏢 Seeding organisations and users...");

  // Beamer Internal
  const [beamerOrg] = await db
    .insert(organisations)
    .values({
      name: "Beamer Internal",
      type: "beamer_internal",
      organisationCategory: "beamer_internal",
      billingEmail: "admin@beamer.com",
      country: "NG",
    })
    .onConflictDoNothing()
    .returning();
  
  const beamerOrgId = beamerOrg?.id || (await db.select().from(organisations).where(eq(organisations.name, "Beamer Internal")))[0].id;
  counts.organisations++;

  // Advertiser: Adidas UK
  const [adidasOrg] = await db
    .insert(organisations)
    .values({
      name: "Adidas UK",
      type: "advertiser",
      organisationCategory: "advertiser",
      billingEmail: "billing@adidas.co.uk",
      country: "GB",
    })
    .onConflictDoNothing()
    .returning();
  
  const adidasOrgId = adidasOrg?.id || (await db.select().from(organisations).where(eq(organisations.name, "Adidas UK")))[0].id;
  counts.organisations++;

  // Advertiser: iFitness Lekki
  const [iFitnessOrg] = await db
    .insert(organisations)
    .values({
      name: "iFitness Lekki",
      type: "advertiser",
      organisationCategory: "advertiser",
      billingEmail: "admin@ifitness.ng",
      country: "NG",
    })
    .onConflictDoNothing()
    .returning();
  
  const iFitnessOrgId = iFitnessOrg?.id || (await db.select().from(organisations).where(eq(organisations.name, "iFitness Lekki")))[0].id;
  counts.organisations++;

  // Publisher: LagosCabs Ltd
  const [lagosCabsOrg] = await db
    .insert(organisations)
    .values({
      name: "LagosCabs Ltd",
      type: "publisher",
      organisationCategory: "publisher",
      billingEmail: "operations@lagoscabs.ng",
      country: "NG",
    })
    .onConflictDoNothing()
    .returning();
  
  const lagosCabsOrgId = lagosCabsOrg?.id || (await db.select().from(organisations).where(eq(organisations.name, "LagosCabs Ltd")))[0].id;
  counts.organisations++;

  // Publisher: Capital OOH Networks
  const [capitalOOHOrg] = await db
    .insert(organisations)
    .values({
      name: "Capital OOH Networks",
      type: "publisher",
      organisationCategory: "publisher",
      billingEmail: "info@capitalooh.ng",
      country: "NG",
    })
    .onConflictDoNothing()
    .returning();
  
  const capitalOOHOrgId = capitalOOHOrg?.id || (await db.select().from(organisations).where(eq(organisations.name, "Capital OOH Networks")))[0].id;
  counts.organisations++;

  // Create users
  const passwordHash = await bcrypt.hash("demo123", SALT_ROUNDS);

  const usersToCreate = [
    { email: "admin@beamer.com", fullName: "Super Admin", orgId: beamerOrgId, role: "admin" as const },
    { email: "ops@beamer.com", fullName: "Operations Manager", orgId: beamerOrgId, role: "ops" as const },
    { email: "marketing@adidas.co.uk", fullName: "Sarah Johnson", orgId: adidasOrgId, role: "admin" as const },
    { email: "campaigns@adidas.co.uk", fullName: "Mark Williams", orgId: adidasOrgId, role: "ops" as const },
    { email: "admin@ifitness.ng", fullName: "Chidi Okafor", orgId: iFitnessOrgId, role: "admin" as const },
    { email: "fleet@lagoscabs.ng", fullName: "Ngozi Adewale", orgId: lagosCabsOrgId, role: "admin" as const },
    { email: "sales@capitalooh.ng", fullName: "Emeka Nwosu", orgId: capitalOOHOrgId, role: "admin" as const },
  ];

  for (const user of usersToCreate) {
    const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({ ...user, passwordHash, updatedAt: new Date() });
      counts.users++;
    }
  }

  console.log(`✓ Created ${counts.organisations} organisations and ${counts.users} users`);

  return {
    beamerOrgId,
    adidasOrgId,
    iFitnessOrgId,
    lagosCabsOrgId,
    capitalOOHOrgId,
  };
}

// =====================================================
// 2. REGIONS
// =====================================================

async function seedRegions() {
  console.log("\n🌍 Seeding regions...");

  const regionsData = [
    { name: "Lagos State", code: "NG-LA", regulatorName: "Lagos Advertising Practitioners Council", requiresPreApproval: true },
    { name: "Federal Capital Territory", code: "NG-FC", regulatorName: "FCT Signage & Advertisement Agency", requiresPreApproval: true },
    { name: "Rivers State", code: "NG-RI", regulatorName: "Rivers State Signage Agency", requiresPreApproval: false },
  ];

  const regionIds: Record<string, string> = {};

  for (const region of regionsData) {
    const existing = await db.select().from(regions).where(eq(regions.code, region.code)).limit(1);
    if (existing.length === 0) {
      const [created] = await db.insert(regions).values(region).returning();
      regionIds[region.code] = created.id;
      counts.regions++;
    } else {
      regionIds[region.code] = existing[0].id;
    }
  }

  console.log(`✓ Created ${counts.regions} regions`);
  return regionIds;
}

// =====================================================
// 3. PUBLISHER PROFILES & VEHICLES
// =====================================================

async function seedPublishersAndVehicles(orgIds: any) {
  console.log("\n🚕 Seeding publisher profiles and vehicles...");

  // LagosCabs Publisher Profile
  const existingLagosCabs = await db.select().from(publisherProfiles)
    .where(eq(publisherProfiles.organisationId, orgIds.lagosCabsOrgId))
    .limit(1);

  let lagosCabsPublisherId: string;
  if (existingLagosCabs.length === 0) {
    const [profile] = await db.insert(publisherProfiles).values({
      organisationId: orgIds.lagosCabsOrgId,
      publisherType: "organisation",
      fullName: "LagosCabs Fleet Operations",
      phoneNumber: "+234-803-555-0001",
      email: "fleet@lagoscabs.ng",
      address: "123 Ozumba Mbadiwe Ave, Victoria Island, Lagos",
      notes: "Taxi-top advertising network across Lagos metropolis",
      updatedAt: new Date(),
    }).returning();
    lagosCabsPublisherId = profile.id;
    counts.publisherProfiles++;
  } else {
    lagosCabsPublisherId = existingLagosCabs[0].id;
  }

  // Capital OOH Publisher Profile
  const existingCapital = await db.select().from(publisherProfiles)
    .where(eq(publisherProfiles.organisationId, orgIds.capitalOOHOrgId))
    .limit(1);

  let capitalPublisherId: string;
  if (existingCapital.length === 0) {
    const [profile] = await db.insert(publisherProfiles).values({
      organisationId: orgIds.capitalOOHOrgId,
      publisherType: "organisation",
      fullName: "Capital OOH Networks Limited",
      phoneNumber: "+234-809-555-0002",
      email: "info@capitalooh.ng",
      address: "45 Adeola Odeku Street, VI, Lagos",
      notes: "Premium billboard and indoor display network",
      updatedAt: new Date(),
    }).returning();
    capitalPublisherId = profile.id;
    counts.publisherProfiles++;
  } else {
    capitalPublisherId = existingCapital[0].id;
  }

  // Create vehicles for LagosCabs
  const vehiclesData = [
    { id: "VEH-LC-001", identifier: "Taxi-001", licencePlate: "LSR-789AA", make: "Toyota", model: "Camry", year: "2021", colour: "Yellow" },
    { id: "VEH-LC-002", identifier: "Taxi-002", licencePlate: "LSR-456BC", make: "Honda", model: "Accord", year: "2020", colour: "Yellow" },
    { id: "VEH-LC-003", identifier: "Taxi-003", licencePlate: "LSR-234DE", make: "Toyota", model: "Corolla", year: "2022", colour: "Yellow" },
    { id: "VEH-LC-004", identifier: "Taxi-004", licencePlate: "LSR-678FG", make: "Nissan", model: "Altima", year: "2021", colour: "Yellow" },
    { id: "VEH-LC-005", identifier: "Taxi-005", licencePlate: "LSR-901HI", make: "Toyota", model: "Camry", year: "2023", colour: "Yellow" },
    { id: "VEH-LC-006", identifier: "Taxi-006", licencePlate: "LSR-345JK", make: "Honda", model: "Civic", year: "2021", colour: "Yellow" },
  ];

  for (const vehicle of vehiclesData) {
    const existing = await db.select().from(vehicles).where(eq(vehicles.id, vehicle.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(vehicles).values({
        ...vehicle,
        publisherOrgId: orgIds.lagosCabsOrgId,
        notes: "Active taxi with roof-mounted digital display",
        updatedAt: new Date(),
      });
      counts.vehicles++;
    }
  }

  console.log(`✓ Created ${counts.publisherProfiles} publisher profiles and ${counts.vehicles} vehicles`);

  return { lagosCabsPublisherId, capitalPublisherId };
}

// =====================================================
// 4. SCREENS & SCREEN GROUPS
// =====================================================

async function seedScreensAndGroups(orgIds: any, publisherIds: any) {
  console.log("\n📺 Seeding screens and screen groups...");

  const screensData = [
    // LagosCabs Taxi Screens (6 vehicle screens)
    { code: "SCR-LC-001", name: "Lekki-VI-Taxi-01", publisherOrgId: orgIds.lagosCabsOrgId, publisherId: publisherIds.lagosCabsPublisherId, screenType: "taxi_top", classification: "vehicle", vehicleId: "VEH-LC-001", city: "Lagos", regionCode: "NG-LA", lat: "6.4281", lng: "3.4219", lastSeenAt: daysFromNow(0) },
    { code: "SCR-LC-002", name: "Ikeja-GRA-Taxi-02", publisherOrgId: orgIds.lagosCabsOrgId, publisherId: publisherIds.lagosCabsPublisherId, screenType: "taxi_top", classification: "vehicle", vehicleId: "VEH-LC-002", city: "Lagos", regionCode: "NG-LA", lat: "6.5833", lng: "3.3561", lastSeenAt: daysFromNow(0) },
    { code: "SCR-LC-003", name: "Lekki-Phase1-Taxi-03", publisherOrgId: orgIds.lagosCabsOrgId, publisherId: publisherIds.lagosCabsPublisherId, screenType: "taxi_top", classification: "vehicle", vehicleId: "VEH-LC-003", city: "Lagos", regionCode: "NG-LA", lat: "6.4475", lng: "3.4702", lastSeenAt: daysFromNow(0) },
    { code: "SCR-LC-004", name: "Yaba-Mainland-Taxi-04", publisherOrgId: orgIds.lagosCabsOrgId, publisherId: publisherIds.lagosCabsPublisherId, screenType: "taxi_top", classification: "vehicle", vehicleId: "VEH-LC-004", city: "Lagos", regionCode: "NG-LA", lat: "6.5158", lng: "3.3776", lastSeenAt: daysFromNow(0) },
    { code: "SCR-LC-005", name: "Ajah-Express-Taxi-05", publisherOrgId: orgIds.lagosCabsOrgId, publisherId: publisherIds.lagosCabsPublisherId, screenType: "taxi_top", classification: "vehicle", vehicleId: "VEH-LC-005", city: "Lagos", regionCode: "NG-LA", lat: "6.4667", lng: "3.5667", lastSeenAt: daysFromNow(-3) },
    { code: "SCR-LC-006", name: "Surulere-Taxi-06", publisherOrgId: orgIds.lagosCabsOrgId, publisherId: publisherIds.lagosCabsPublisherId, screenType: "taxi_top", classification: "vehicle", vehicleId: "VEH-LC-006", city: "Lagos", regionCode: "NG-LA", lat: "6.4963", lng: "3.3611", lastSeenAt: daysFromNow(0) },
    
    // Capital OOH Billboards (6 billboard screens)
    { code: "SCR-CO-001", name: "Eko-Bridge-Billboard-01", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "billboard", classification: "billboard", structureType: "Digital LED", sizeDescription: "48-sheet (6m x 3m)", illuminationType: "LED Backlit", address: "Eko Bridge, Lagos Island", city: "Lagos", regionCode: "NG-LA", lat: "6.4531", lng: "3.3958", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-002", name: "Third-Mainland-Billboard-02", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "billboard", classification: "billboard", structureType: "Digital LED", sizeDescription: "96-sheet (12m x 3m)", illuminationType: "LED Backlit", address: "Third Mainland Bridge, VI", city: "Lagos", regionCode: "NG-LA", lat: "6.4698", lng: "3.3889", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-003", name: "Lekki-Toll-Billboard-03", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "billboard", classification: "billboard", structureType: "Digital LED", sizeDescription: "48-sheet (6m x 3m)", illuminationType: "LED Backlit", address: "Lekki-Epe Expressway, Lekki", city: "Lagos", regionCode: "NG-LA", lat: "6.4404", lng: "3.4635", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-004", name: "Allen-Avenue-Billboard-04", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "billboard", classification: "billboard", structureType: "Static Vinyl", sizeDescription: "48-sheet (6m x 3m)", illuminationType: "Front Lit", address: "Allen Avenue, Ikeja", city: "Lagos", regionCode: "NG-LA", lat: "6.6018", lng: "3.3515", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-005", name: "Falomo-Roundabout-Billboard-05", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "billboard", classification: "billboard", structureType: "Digital LED", sizeDescription: "96-sheet (12m x 3m)", illuminationType: "LED Backlit", address: "Falomo Roundabout, Ikoyi", city: "Lagos", regionCode: "NG-LA", lat: "6.4467", lng: "3.4314", lastSeenAt: daysFromNow(-4) },
    { code: "SCR-CO-006", name: "Ojota-Junction-Billboard-06", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "billboard", classification: "billboard", structureType: "Digital LED", sizeDescription: "48-sheet (6m x 3m)", illuminationType: "LED Backlit", address: "Ikorodu Road, Ojota", city: "Lagos", regionCode: "NG-LA", lat: "6.5795", lng: "3.3676", lastSeenAt: daysFromNow(0) },
    
    // Capital OOH Indoor Screens (6 indoor screens)
    { code: "SCR-CO-007", name: "Palms-Mall-Indoor-01", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "indoor_display", classification: "indoor", venueName: "The Palms Shopping Mall", venueType: "Shopping Mall", venueAddress: "Lekki-Epe Expressway, Lekki", city: "Lagos", regionCode: "NG-LA", lat: "6.4394", lng: "3.5467", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-008", name: "Ikeja-City-Mall-Indoor-02", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "indoor_display", classification: "indoor", venueName: "Ikeja City Mall", venueType: "Shopping Mall", venueAddress: "Obafemi Awolowo Way, Ikeja", city: "Lagos", regionCode: "NG-LA", lat: "6.6208", lng: "3.3421", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-009", name: "Silverbird-Galleria-Indoor-03", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "indoor_display", classification: "indoor", venueName: "Silverbird Galleria", venueType: "Shopping Mall", venueAddress: "Festival Road, Victoria Island", city: "Lagos", regionCode: "NG-LA", lat: "6.4244", lng: "3.4272", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-010", name: "Fitness-Hub-Lekki-Indoor-04", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "indoor_display", classification: "indoor", venueName: "iFitness Lekki Phase 1", venueType: "Gym/Fitness Center", venueAddress: "Admiralty Way, Lekki Phase 1", city: "Lagos", regionCode: "NG-LA", lat: "6.4470", lng: "3.4708", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-011", name: "Airport-Lounge-Indoor-05", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "indoor_display", classification: "indoor", venueName: "Murtala Muhammed Airport Terminal 2", venueType: "Airport", venueAddress: "Airport Road, Ikeja", city: "Lagos", regionCode: "NG-LA", lat: "6.5774", lng: "3.3213", lastSeenAt: daysFromNow(0) },
    { code: "SCR-CO-012", name: "Abuja-Mall-Indoor-06", publisherOrgId: orgIds.capitalOOHOrgId, publisherId: publisherIds.capitalPublisherId, screenType: "indoor_display", classification: "indoor", venueName: "Jabi Lake Mall", venueType: "Shopping Mall", venueAddress: "Jabi District, Abuja", city: "Abuja", regionCode: "NG-FC", lat: "9.0765", lng: "7.4165", lastSeenAt: daysFromNow(-5) },
  ];

  const screenIdMap: Record<string, string> = {};

  for (const screen of screensData) {
    const existing = await db.select().from(screens).where(eq(screens.code, screen.code)).limit(1);
    if (existing.length === 0) {
      const [created] = await db.insert(screens).values({
        code: screen.code,
        name: screen.name,
        publisherOrgId: screen.publisherOrgId,
        publisherId: screen.publisherId,
        screenType: screen.screenType,
        screenClassification: screen.classification,
        vehicleId: screen.vehicleId || null,
        structureType: screen.structureType || null,
        sizeDescription: screen.sizeDescription || null,
        illuminationType: screen.illuminationType || null,
        address: screen.address || null,
        venueName: screen.venueName || null,
        venueType: screen.venueType || null,
        venueAddress: screen.venueAddress || null,
        city: screen.city,
        regionCode: screen.regionCode,
        lat: screen.lat,
        lng: screen.lng,
        latitude: screen.lat,
        longitude: screen.lng,
        resolutionWidth: 1920,
        resolutionHeight: 1080,
        status: "active",
        lastSeenAt: screen.lastSeenAt,
      }).returning();
      screenIdMap[screen.code] = created.id;
      counts.screens++;
    } else {
      screenIdMap[screen.code] = existing[0].id;
    }
  }

  // Create Screen Groups
  const groupsData = [
    { name: "Lekki Fitness Loop", publisherOrgId: orgIds.capitalOOHOrgId, description: "Screens around fitness centers and upscale Lekki area", screens: ["SCR-LC-003", "SCR-CO-003", "SCR-CO-010"] },
    { name: "City Centre Commuters", publisherOrgId: orgIds.lagosCabsOrgId, description: "High-traffic taxi routes in central Lagos", screens: ["SCR-LC-001", "SCR-LC-002", "SCR-LC-004"] },
    { name: "Premium Mall Network", publisherOrgId: orgIds.capitalOOHOrgId, description: "Indoor displays in premium shopping malls", screens: ["SCR-CO-007", "SCR-CO-008", "SCR-CO-009"] },
    { name: "Expressway Billboards", publisherOrgId: orgIds.capitalOOHOrgId, description: "Large format billboards on major expressways", screens: ["SCR-CO-001", "SCR-CO-002", "SCR-CO-003", "SCR-CO-006"] },
  ];

  for (const group of groupsData) {
    const existing = await db.select().from(screenGroups)
      .where(and(
        eq(screenGroups.name, group.name),
        eq(screenGroups.publisherOrgId, group.publisherOrgId)
      ))
      .limit(1);

    let groupId: string;
    if (existing.length === 0) {
      const [created] = await db.insert(screenGroups).values({
        name: group.name,
        publisherOrgId: group.publisherOrgId,
        description: group.description,
      }).returning();
      groupId = created.id;
      counts.screenGroups++;
    } else {
      groupId = existing[0].id;
    }

    // Add screens to group
    for (const screenCode of group.screens) {
      const screenId = screenIdMap[screenCode];
      if (screenId) {
        await db.insert(screenGroupMembers).values({
          groupId,
          screenId,
        }).onConflictDoNothing();
      }
    }
  }

  console.log(`✓ Created ${counts.screens} screens and ${counts.screenGroups} screen groups`);
  return screenIdMap;
}

// =====================================================
// 5. CAMPAIGNS, BOOKINGS, FLIGHTS, CREATIVES
// =====================================================

async function seedCampaignsFlightsTargeting(orgIds: any, screenIdMap: Record<string, string>) {
  console.log("\n📋 Seeding campaigns, bookings, flights, and creatives...");

  // Get screen group IDs
  const lekkiFitnessGroup = await db.select().from(screenGroups).where(eq(screenGroups.name, "Lekki Fitness Loop")).limit(1);
  const premiumMallsGroup = await db.select().from(screenGroups).where(eq(screenGroups.name, "Premium Mall Network")).limit(1);
  const expresswayGroup = await db.select().from(screenGroups).where(eq(screenGroups.name, "Expressway Billboards")).limit(1);

  // ========== ADIDAS UK CAMPAIGNS ==========

  // Campaign A: Past campaign (ended 7 days ago)
  let adidasCampaignA = await db.select().from(campaigns)
    .where(and(eq(campaigns.name, "Adidas Ultraboost Launch - Q4 2024"), eq(campaigns.advertiserOrgId, orgIds.adidasOrgId)))
    .limit(1);
  
  let adidasCampaignAId: string;
  if (adidasCampaignA.length === 0) {
    const [created] = await db.insert(campaigns).values({
      id: deterministicUUID("campaign-adidas-ultraboost-2024"),
      advertiserOrgId: orgIds.adidasOrgId,
      name: "Adidas Ultraboost Launch - Q4 2024",
      objective: "Product launch and brand awareness for new Ultraboost running shoes",
      startDate: formatDate(daysFromNow(-21)),
      endDate: formatDate(daysFromNow(-7)),
      totalBudget: 500000,
      currency: "NGN",
      status: "completed",
      targetingJson: { cities: ["Lagos"], regions: ["NG-LA"], demographics: ["18-35", "fitness-oriented"] },
    }).onConflictDoNothing().returning();
    adidasCampaignAId = created?.id || deterministicUUID("campaign-adidas-ultraboost-2024");
    if (created) counts.campaigns++;
  } else {
    adidasCampaignAId = adidasCampaignA[0].id;
  }

  // Campaign B: Active campaign (started 7 days ago, ends 7 days from now)
  let adidasCampaignB = await db.select().from(campaigns)
    .where(and(eq(campaigns.name, "Adidas Summer Collection 2025"), eq(campaigns.advertiserOrgId, orgIds.adidasOrgId)))
    .limit(1);
  
  let adidasCampaignBId: string;
  if (adidasCampaignB.length === 0) {
    const [created] = await db.insert(campaigns).values({
      id: deterministicUUID("campaign-adidas-summer-2025"),
      advertiserOrgId: orgIds.adidasOrgId,
      name: "Adidas Summer Collection 2025",
      objective: "Drive traffic to retail stores and online sales for summer apparel",
      startDate: formatDate(daysFromNow(-7)),
      endDate: formatDate(daysFromNow(7)),
      totalBudget: 750000,
      currency: "NGN",
      status: "active",
      targetingJson: { cities: ["Lagos", "Abuja"], regions: ["NG-LA", "NG-FC"], timeWindows: ["06:00-10:00", "17:00-21:00"] },
    }).onConflictDoNothing().returning();
    adidasCampaignBId = created?.id || deterministicUUID("campaign-adidas-summer-2025");
    if (created) counts.campaigns++;
  } else {
    adidasCampaignBId = adidasCampaignB[0].id;
  }

  // Campaign C: Future campaign (starts in 3 days, ends in 14 days)
  let adidasCampaignC = await db.select().from(campaigns)
    .where(and(eq(campaigns.name, "Adidas World Cup Partnership"), eq(campaigns.advertiserOrgId, orgIds.adidasOrgId)))
    .limit(1);
  
  let adidasCampaignCId: string;
  if (adidasCampaignC.length === 0) {
    const [created] = await db.insert(campaigns).values({
      id: deterministicUUID("campaign-adidas-worldcup-2025"),
      advertiserOrgId: orgIds.adidasOrgId,
      name: "Adidas World Cup Partnership",
      objective: "Brand association with major sporting event",
      startDate: formatDate(daysFromNow(3)),
      endDate: formatDate(daysFromNow(17)),
      totalBudget: 1000000,
      currency: "NGN",
      status: "scheduled",
      targetingJson: { cities: ["Lagos", "Abuja"], regions: ["NG-LA", "NG-FC"], demographics: ["sports-fans", "18-45"] },
    }).onConflictDoNothing().returning();
    adidasCampaignCId = created?.id || deterministicUUID("campaign-adidas-worldcup-2025");
    if (created) counts.campaigns++;
  } else {
    adidasCampaignCId = adidasCampaignC[0].id;
  }

  // ========== iFITNESS LEKKI CAMPAIGN ==========

  let iFitnessCampaign = await db.select().from(campaigns)
    .where(and(eq(campaigns.name, "iFitness New Year Promo"), eq(campaigns.advertiserOrgId, orgIds.iFitnessOrgId)))
    .limit(1);
  
  let iFitnessCampaignId: string;
  if (iFitnessCampaign.length === 0) {
    const [created] = await db.insert(campaigns).values({
      id: deterministicUUID("campaign-ifitness-newyear-2025"),
      advertiserOrgId: orgIds.iFitnessOrgId,
      name: "iFitness New Year Promo",
      objective: "Drive gym membership sign-ups for New Year resolution period",
      startDate: formatDate(daysFromNow(-3)),
      endDate: formatDate(daysFromNow(4)),
      totalBudget: 150000,
      currency: "NGN",
      status: "active",
      targetingJson: { cities: ["Lagos"], regions: ["NG-LA"], screenGroups: ["Lekki Fitness Loop"], timeWindows: ["06:00-10:00", "17:00-21:00"] },
    }).onConflictDoNothing().returning();
    iFitnessCampaignId = created?.id || deterministicUUID("campaign-ifitness-newyear-2025");
    if (created) counts.campaigns++;
  } else {
    iFitnessCampaignId = iFitnessCampaign[0].id;
  }

  // ========== BOOKINGS ==========

  // Adidas Campaign A Booking
  let adidasBookingA = await db.select().from(bookings).where(eq(bookings.campaignId, adidasCampaignAId)).limit(1);
  let adidasBookingAId: string;
  if (adidasBookingA.length === 0) {
    const [created] = await db.insert(bookings).values({
      advertiserOrgId: orgIds.adidasOrgId,
      campaignId: adidasCampaignAId,
      startDate: formatDate(daysFromNow(-21)),
      endDate: formatDate(daysFromNow(-7)),
      currency: "NGN",
      billingModel: "cpm",
      rate: 500,
      agreedImpressions: 1000000,
      agreedAmountMinor: 50000000,
      status: "completed",
    }).returning();
    adidasBookingAId = created.id;
    counts.bookings++;
  } else {
    adidasBookingAId = adidasBookingA[0].id;
  }

  // Adidas Campaign B Booking
  let adidasBookingB = await db.select().from(bookings).where(eq(bookings.campaignId, adidasCampaignBId)).limit(1);
  let adidasBookingBId: string;
  if (adidasBookingB.length === 0) {
    const [created] = await db.insert(bookings).values({
      advertiserOrgId: orgIds.adidasOrgId,
      campaignId: adidasCampaignBId,
      startDate: formatDate(daysFromNow(-7)),
      endDate: formatDate(daysFromNow(7)),
      currency: "NGN",
      billingModel: "cpm",
      rate: 600,
      agreedImpressions: 1250000,
      agreedAmountMinor: 75000000,
      status: "active",
    }).returning();
    adidasBookingBId = created.id;
    counts.bookings++;
  } else {
    adidasBookingBId = adidasBookingB[0].id;
  }

  // Adidas Campaign C Booking
  let adidasBookingC = await db.select().from(bookings).where(eq(bookings.campaignId, adidasCampaignCId)).limit(1);
  let adidasBookingCId: string;
  if (adidasBookingC.length === 0) {
    const [created] = await db.insert(bookings).values({
      advertiserOrgId: orgIds.adidasOrgId,
      campaignId: adidasCampaignCId,
      startDate: formatDate(daysFromNow(3)),
      endDate: formatDate(daysFromNow(17)),
      currency: "NGN",
      billingModel: "flat_fee",
      rate: 100000000,
      agreedAmountMinor: 100000000,
      status: "scheduled",
    }).returning();
    adidasBookingCId = created.id;
    counts.bookings++;
  } else {
    adidasBookingCId = adidasBookingC[0].id;
  }

  // iFitness Booking
  let iFitnessBooking = await db.select().from(bookings).where(eq(bookings.campaignId, iFitnessCampaignId)).limit(1);
  let iFitnessBookingId: string;
  if (iFitnessBooking.length === 0) {
    const [created] = await db.insert(bookings).values({
      advertiserOrgId: orgIds.iFitnessOrgId,
      campaignId: iFitnessCampaignId,
      startDate: formatDate(daysFromNow(-3)),
      endDate: formatDate(daysFromNow(4)),
      currency: "NGN",
      billingModel: "cpm",
      rate: 400,
      agreedImpressions: 375000,
      agreedAmountMinor: 15000000,
      status: "active",
    }).returning();
    iFitnessBookingId = created.id;
    counts.bookings++;
  } else {
    iFitnessBookingId = iFitnessBooking[0].id;
  }

  // ========== CREATIVES ==========

  // Adidas creatives
  let adidasCreativeA1 = await db.select().from(creatives)
    .where(and(eq(creatives.name, "Ultraboost Product Hero"), eq(creatives.campaignId, adidasCampaignAId)))
    .limit(1);
  let adidasCreativeA1Id: string;
  if (adidasCreativeA1.length === 0) {
    const [created] = await db.insert(creatives).values({
      campaignId: adidasCampaignAId,
      name: "Ultraboost Product Hero",
      fileUrl: "https://cdn.beamer.ng/creatives/adidas-ultraboost-hero.mp4",
      mimeType: "video/mp4",
      durationSeconds: 15,
      width: 1920,
      height: 1080,
      status: "approved",
      regionsRequired: ["NG-LA"],
    }).returning();
    adidasCreativeA1Id = created.id;
    counts.creatives++;
  } else {
    adidasCreativeA1Id = adidasCreativeA1[0].id;
  }

  let adidasCreativeB1 = await db.select().from(creatives)
    .where(and(eq(creatives.name, "Summer Collection Main"), eq(creatives.campaignId, adidasCampaignBId)))
    .limit(1);
  let adidasCreativeB1Id: string;
  if (adidasCreativeB1.length === 0) {
    const [created] = await db.insert(creatives).values({
      campaignId: adidasCampaignBId,
      name: "Summer Collection Main",
      fileUrl: "https://cdn.beamer.ng/creatives/adidas-summer-2025.mp4",
      mimeType: "video/mp4",
      durationSeconds: 20,
      width: 1920,
      height: 1080,
      status: "approved",
      regionsRequired: ["NG-LA", "NG-FC"],
    }).returning();
    adidasCreativeB1Id = created.id;
    counts.creatives++;
  } else {
    adidasCreativeB1Id = adidasCreativeB1[0].id;
  }

  let adidasCreativeC1 = await db.select().from(creatives)
    .where(and(eq(creatives.name, "World Cup Teaser"), eq(creatives.campaignId, adidasCampaignCId)))
    .limit(1);
  let adidasCreativeC1Id: string;
  if (adidasCreativeC1.length === 0) {
    const [created] = await db.insert(creatives).values({
      campaignId: adidasCampaignCId,
      name: "World Cup Teaser",
      fileUrl: "https://cdn.beamer.ng/creatives/adidas-worldcup-2025.mp4",
      mimeType: "video/mp4",
      durationSeconds: 30,
      width: 1920,
      height: 1080,
      status: "pending_review",
      regionsRequired: ["NG-LA", "NG-FC"],
    }).returning();
    adidasCreativeC1Id = created.id;
    counts.creatives++;
  } else {
    adidasCreativeC1Id = adidasCreativeC1[0].id;
  }

  // iFitness creative
  let iFitnessCreative1 = await db.select().from(creatives)
    .where(and(eq(creatives.name, "New Year Promo 50% Off"), eq(creatives.campaignId, iFitnessCampaignId)))
    .limit(1);
  let iFitnessCreative1Id: string;
  if (iFitnessCreative1.length === 0) {
    const [created] = await db.insert(creatives).values({
      campaignId: iFitnessCampaignId,
      name: "New Year Promo 50% Off",
      fileUrl: "https://cdn.beamer.ng/creatives/ifitness-newyear-promo.mp4",
      mimeType: "video/mp4",
      durationSeconds: 10,
      width: 1920,
      height: 1080,
      status: "approved",
      regionsRequired: ["NG-LA"],
    }).returning();
    iFitnessCreative1Id = created.id;
    counts.creatives++;
  } else {
    iFitnessCreative1Id = iFitnessCreative1[0].id;
  }

  // ========== FLIGHTS ==========

  // Get first screen group ID for targeting
  const lekkiGroupId = lekkiFitnessGroup.length > 0 ? lekkiFitnessGroup[0].id : null;
  const mallsGroupId = premiumMallsGroup.length > 0 ? premiumMallsGroup[0].id : null;
  const expresswayGroupId = expresswayGroup.length > 0 ? expresswayGroup[0].id : null;

  // Adidas Campaign A Flights
  let adidasFlightA1 = await db.select().from(flights)
    .where(and(eq(flights.name, "All Day Coverage"), eq(flights.campaignId, adidasCampaignAId)))
    .limit(1);
  let adidasFlightA1Id: string;
  if (adidasFlightA1.length === 0) {
    const [created] = await db.insert(flights).values({
      campaignId: adidasCampaignAId,
      defaultBookingId: adidasBookingAId,
      name: "All Day Coverage",
      startDatetime: new Date(daysFromNow(-21).setHours(0, 0, 0)),
      endDatetime: new Date(daysFromNow(-7).setHours(23, 59, 59)),
      targetType: "screen_group",
      targetId: expresswayGroupId || screenIdMap["SCR-CO-001"],
      maxImpressions: 1000000,
      status: "completed",
    }).returning();
    adidasFlightA1Id = created.id;
    counts.flights++;
  } else {
    adidasFlightA1Id = adidasFlightA1[0].id;
  }

  // Adidas Campaign B Flights (active)
  let adidasFlightB1 = await db.select().from(flights)
    .where(and(eq(flights.name, "Morning Commute"), eq(flights.campaignId, adidasCampaignBId)))
    .limit(1);
  let adidasFlightB1Id: string;
  if (adidasFlightB1.length === 0) {
    const [created] = await db.insert(flights).values({
      campaignId: adidasCampaignBId,
      defaultBookingId: adidasBookingBId,
      name: "Morning Commute",
      startDatetime: new Date(daysFromNow(-7).setHours(6, 0, 0)),
      endDatetime: new Date(daysFromNow(7).setHours(10, 0, 0)),
      targetType: "screen_group",
      targetId: expresswayGroupId || screenIdMap["SCR-CO-001"],
      maxImpressions: 625000,
      status: "active",
    }).returning();
    adidasFlightB1Id = created.id;
    counts.flights++;
  } else {
    adidasFlightB1Id = adidasFlightB1[0].id;
  }

  let adidasFlightB2 = await db.select().from(flights)
    .where(and(eq(flights.name, "Evening Rush"), eq(flights.campaignId, adidasCampaignBId)))
    .limit(1);
  let adidasFlightB2Id: string;
  if (adidasFlightB2.length === 0) {
    const [created] = await db.insert(flights).values({
      campaignId: adidasCampaignBId,
      defaultBookingId: adidasBookingBId,
      name: "Evening Rush",
      startDatetime: new Date(daysFromNow(-7).setHours(17, 0, 0)),
      endDatetime: new Date(daysFromNow(7).setHours(21, 0, 0)),
      targetType: "screen_group",
      targetId: mallsGroupId || screenIdMap["SCR-CO-007"],
      maxImpressions: 625000,
      status: "active",
    }).returning();
    adidasFlightB2Id = created.id;
    counts.flights++;
  } else {
    adidasFlightB2Id = adidasFlightB2[0].id;
  }

  // Adidas Campaign C Flights (future)
  let adidasFlightC1 = await db.select().from(flights)
    .where(and(eq(flights.name, "Premium Placement"), eq(flights.campaignId, adidasCampaignCId)))
    .limit(1);
  let adidasFlightC1Id: string;
  if (adidasFlightC1.length === 0) {
    const [created] = await db.insert(flights).values({
      campaignId: adidasCampaignCId,
      defaultBookingId: adidasBookingCId,
      name: "Premium Placement",
      startDatetime: new Date(daysFromNow(3).setHours(0, 0, 0)),
      endDatetime: new Date(daysFromNow(17).setHours(23, 59, 59)),
      targetType: "screen_group",
      targetId: expresswayGroupId || screenIdMap["SCR-CO-001"],
      maxImpressions: null,
      status: "scheduled",
    }).returning();
    adidasFlightC1Id = created.id;
    counts.flights++;
  } else {
    adidasFlightC1Id = adidasFlightC1[0].id;
  }

  // iFitness Flight
  let iFitnessFlight1 = await db.select().from(flights)
    .where(and(eq(flights.name, "Lekki Fitness Focus"), eq(flights.campaignId, iFitnessCampaignId)))
    .limit(1);
  let iFitnessFlight1Id: string;
  if (iFitnessFlight1.length === 0) {
    const [created] = await db.insert(flights).values({
      campaignId: iFitnessCampaignId,
      defaultBookingId: iFitnessBookingId,
      name: "Lekki Fitness Focus",
      startDatetime: new Date(daysFromNow(-3).setHours(6, 0, 0)),
      endDatetime: new Date(daysFromNow(4).setHours(21, 0, 0)),
      targetType: "screen_group",
      targetId: lekkiGroupId || screenIdMap["SCR-CO-010"],
      maxImpressions: 375000,
      status: "active",
    }).returning();
    iFitnessFlight1Id = created.id;
    counts.flights++;
  } else {
    iFitnessFlight1Id = iFitnessFlight1[0].id;
  }

  console.log(`✓ Created ${counts.campaigns} campaigns, ${counts.bookings} bookings, ${counts.flights} flights, ${counts.creatives} creatives`);

  return {
    campaigns: {
      adidasCampaignAId,
      adidasCampaignBId,
      adidasCampaignCId,
      iFitnessCampaignId,
    },
    flights: {
      adidasFlightA1Id,
      adidasFlightB1Id,
      adidasFlightB2Id,
      iFitnessFlight1Id,
    },
    creatives: {
      adidasCreativeA1Id,
      adidasCreativeB1Id,
      iFitnessCreative1Id,
    },
  };
}

// =====================================================
// 6. PLAYERS & HEARTBEATS
// =====================================================

async function seedPlayersAndHeartbeats(screenIdMap: Record<string, string>) {
  console.log("\n🎮 Seeding players and heartbeats...");

  const playerIdMap: Record<string, string> = {};
  const screenCodes = Object.keys(screenIdMap);

  for (const screenCode of screenCodes) {
    const screenId = screenIdMap[screenCode];
    const playerId = `PLR-${nanoid(12)}`;
    
    const existing = await db.select().from(players).where(eq(players.screenId, screenId)).limit(1);
    if (existing.length === 0) {
      await db.insert(players).values({
        id: playerId,
        screenId,
        authToken: nanoid(32),
        lastSeenAt: daysFromNow(0),
        softwareVersion: "v2.5.0",
        configHash: nanoid(16),
      });
      playerIdMap[screenCode] = playerId;
      counts.players++;
    } else {
      playerIdMap[screenCode] = existing[0].id;
    }

    // Generate heartbeats
    const isOffline = ["SCR-LC-005", "SCR-CO-005", "SCR-CO-012"].includes(screenCode);
    const heartbeatDays = isOffline ? [-3, -4, -5] : [0, 0, -1, -1, -2];

    for (const dayOffset of heartbeatDays) {
      const timestamp = daysFromNow(dayOffset);
      timestamp.setHours(randomBetween(0, 23), randomBetween(0, 59), 0);

      await db.insert(heartbeats).values({
        playerId: playerIdMap[screenCode] || playerId,
        screenId,
        timestamp,
        status: "online",
        softwareVersion: "v2.5.0",
        storageFreeMb: randomBetween(10000, 50000),
        cpuUsage: (randomBetween(10, 60) / 100).toFixed(2),
        networkType: randomFrom(["4G", "5G", "WiFi"]),
        signalStrength: randomBetween(-80, -40),
        lat: null,
        lng: null,
      }).onConflictDoNothing();
      counts.heartbeats++;
    }
  }

  console.log(`✓ Created ${counts.players} players and ${counts.heartbeats} heartbeats`);
  return playerIdMap;
}

// =====================================================
// 7. PLAY EVENTS (PROOF-OF-PLAY)
// =====================================================

async function seedPlayEvents(
  screenIdMap: Record<string, string>,
  playerIdMap: Record<string, string>,
  campaignData: any
) {
  console.log("\n▶️  Seeding play events (proof-of-play)...");

  const { campaigns, flights, creatives } = campaignData;

  // Helper: Generate play events for a specific campaign/flight
  async function generatePlayEvents(
    campaignId: string,
    flightId: string,
    creativeId: string,
    screenCodes: string[],
    daysRange: { start: number; end: number },
    eventsPerDayPerScreen: { min: number; max: number }
  ) {
    const batch: any[] = [];
    
    for (let dayOffset = daysRange.start; dayOffset <= daysRange.end; dayOffset++) {
      for (const screenCode of screenCodes) {
        const screenId = screenIdMap[screenCode];
        const playerId = playerIdMap[screenCode];
        if (!screenId || !playerId) continue;

        const numEvents = randomBetween(eventsPerDayPerScreen.min, eventsPerDayPerScreen.max);

        for (let i = 0; i < numEvents; i++) {
          const startedAt = daysFromNow(dayOffset);
          startedAt.setHours(randomBetween(6, 21), randomBetween(0, 59), randomBetween(0, 59));

          batch.push({
            playerId,
            screenId,
            creativeId,
            campaignId,
            flightId,
            startedAt,
            durationSeconds: randomBetween(10, 30),
            playStatus: "completed",
            lat: null,
            lng: null,
          });
          counts.playEvents++;
        }
      }
    }
    
    // Insert in batches of 500
    for (let i = 0; i < batch.length; i += 500) {
      const chunk = batch.slice(i, i + 500);
      await db.insert(playEvents).values(chunk).onConflictDoNothing();
    }
  }

  // Adidas Campaign A (past): 7-14 days of historical play events
  const expresswayScreens = ["SCR-CO-001", "SCR-CO-002", "SCR-CO-003", "SCR-CO-006"];
  await generatePlayEvents(
    campaigns.adidasCampaignAId,
    flights.adidasFlightA1Id,
    creatives.adidasCreativeA1Id,
    expresswayScreens,
    { start: -21, end: -7 },
    { min: 100, max: 300 }
  );

  // Adidas Campaign B (active): Last 7 days of play events
  // Morning flight
  await generatePlayEvents(
    campaigns.adidasCampaignBId,
    flights.adidasFlightB1Id,
    creatives.adidasCreativeB1Id,
    expresswayScreens,
    { start: -7, end: 0 },
    { min: 150, max: 400 }
  );

  // Evening flight (mall screens)
  const mallScreens = ["SCR-CO-007", "SCR-CO-008", "SCR-CO-009"];
  await generatePlayEvents(
    campaigns.adidasCampaignBId,
    flights.adidasFlightB2Id,
    creatives.adidasCreativeB1Id,
    mallScreens,
    { start: -7, end: 0 },
    { min: 100, max: 250 }
  );

  // iFitness Campaign (active local): Last 3 days
  const fitnessScreens = ["SCR-LC-003", "SCR-CO-003", "SCR-CO-010"];
  await generatePlayEvents(
    campaigns.iFitnessCampaignId,
    flights.iFitnessFlight1Id,
    creatives.iFitnessCreative1Id,
    fitnessScreens,
    { start: -3, end: 0 },
    { min: 20, max: 100 }
  );

  // Adidas Campaign C (future): NO play events

  console.log(`✓ Created ${counts.playEvents} play events`);
}

// =====================================================
// 8. SCREEN LOCATION HISTORY (GPS Mobility Data)
// =====================================================

// Lagos area waypoints for realistic movement simulation
const LAGOS_ROUTES = {
  lekki_vi: [
    { lat: 6.4281, lng: 3.4219 }, // Lekki
    { lat: 6.4350, lng: 3.4100 }, // Along Lekki-Epe
    { lat: 6.4400, lng: 3.4000 },
    { lat: 6.4450, lng: 3.3900 },
    { lat: 6.4500, lng: 3.3800 },
    { lat: 6.4550, lng: 3.3700 },
    { lat: 6.4531, lng: 3.3950 }, // Victoria Island
    { lat: 6.4350, lng: 3.4100 }, // Back towards Lekki
    { lat: 6.4281, lng: 3.4219 }, // Return
  ],
  ikeja_mainland: [
    { lat: 6.5833, lng: 3.3561 }, // Ikeja GRA
    { lat: 6.5700, lng: 3.3500 },
    { lat: 6.5600, lng: 3.3450 },
    { lat: 6.5500, lng: 3.3400 },
    { lat: 6.5400, lng: 3.3500 }, // Towards Yaba
    { lat: 6.5300, lng: 3.3600 },
    { lat: 6.5158, lng: 3.3776 }, // Yaba
    { lat: 6.5300, lng: 3.3600 }, // Return
    { lat: 6.5500, lng: 3.3400 },
    { lat: 6.5833, lng: 3.3561 }, // Back to Ikeja
  ],
  ajah_express: [
    { lat: 6.4667, lng: 3.5667 }, // Ajah
    { lat: 6.4600, lng: 3.5500 },
    { lat: 6.4550, lng: 3.5300 },
    { lat: 6.4500, lng: 3.5100 },
    { lat: 6.4475, lng: 3.4702 }, // Lekki Phase 1
    { lat: 6.4500, lng: 3.5100 },
    { lat: 6.4550, lng: 3.5300 },
    { lat: 6.4600, lng: 3.5500 },
    { lat: 6.4667, lng: 3.5667 }, // Back to Ajah
  ],
  surulere_loop: [
    { lat: 6.4963, lng: 3.3611 }, // Surulere
    { lat: 6.4900, lng: 3.3550 },
    { lat: 6.4850, lng: 3.3500 },
    { lat: 6.4800, lng: 3.3450 },
    { lat: 6.4750, lng: 3.3400 },
    { lat: 6.4700, lng: 3.3500 },
    { lat: 6.4750, lng: 3.3550 },
    { lat: 6.4850, lng: 3.3580 },
    { lat: 6.4963, lng: 3.3611 }, // Return
  ],
};

async function seedScreenLocationHistory(
  screenIdMap: Record<string, string>,
  playerIdMap: Record<string, string>
) {
  console.log("\n📍 Seeding screen location history (GPS mobility data)...");

  // Vehicle screens with their routes
  const vehicleScreenRoutes: { screenCode: string; route: { lat: number; lng: number }[] }[] = [
    { screenCode: "SCR-LC-001", route: LAGOS_ROUTES.lekki_vi },
    { screenCode: "SCR-LC-002", route: LAGOS_ROUTES.ikeja_mainland },
    { screenCode: "SCR-LC-003", route: LAGOS_ROUTES.lekki_vi },
    { screenCode: "SCR-LC-004", route: LAGOS_ROUTES.ikeja_mainland },
    { screenCode: "SCR-LC-005", route: LAGOS_ROUTES.ajah_express },
    { screenCode: "SCR-LC-006", route: LAGOS_ROUTES.surulere_loop },
  ];

  const now = new Date();
  const locationRecords: {
    id: string;
    screenId: string;
    playerId: string | null;
    recordedAt: Date;
    latitude: string;
    longitude: string;
    source: string;
  }[] = [];

  for (const { screenCode, route } of vehicleScreenRoutes) {
    const screenId = screenIdMap[screenCode];
    const playerId = playerIdMap[screenCode];

    if (!screenId) {
      console.log(`   ⚠️ Screen ${screenCode} not found, skipping`);
      continue;
    }

    // Generate GPS points for the last 14 days
    for (let dayOffset = -14; dayOffset <= 0; dayOffset++) {
      const day = new Date(now);
      day.setDate(day.getDate() + dayOffset);

      // Generate 3-5 trips per day
      const tripsPerDay = randomBetween(3, 5);

      for (let trip = 0; trip < tripsPerDay; trip++) {
        // Each trip starts at different hours (6am-8pm)
        const startHour = 6 + trip * 3;
        
        // Traverse the route with some variation
        for (let pointIdx = 0; pointIdx < route.length; pointIdx++) {
          const point = route[pointIdx];
          
          // Add some random variation to the GPS coordinates (+/- 0.002 degrees ~ 200m)
          const latVariation = (Math.random() - 0.5) * 0.004;
          const lngVariation = (Math.random() - 0.5) * 0.004;

          const recordedAt = new Date(day);
          recordedAt.setHours(startHour, pointIdx * 8 + randomBetween(0, 5), randomBetween(0, 59));

          locationRecords.push({
            id: `loc-${screenCode}-${dayOffset + 14}-${trip}-${pointIdx}`,
            screenId,
            playerId: playerId || null,
            recordedAt,
            latitude: (point.lat + latVariation).toFixed(7),
            longitude: (point.lng + lngVariation).toFixed(7),
            source: "heartbeat",
          });
        }
      }
    }
  }

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < locationRecords.length; i += batchSize) {
    const batch = locationRecords.slice(i, i + batchSize);
    await db.insert(screenLocationHistory).values(batch).onConflictDoNothing();
    counts.screenLocationHistory += batch.length;
  }

  console.log(`✓ Created ${counts.screenLocationHistory} screen location history records`);
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function run() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 BEAMER CMS - COMPREHENSIVE SEED SCRIPT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  checkEnvironment();

  try {
    // Step 1: Organisations & Users
    const orgIds = await seedOrganisationsAndUsers();

    // Step 2: Regions
    const regionIds = await seedRegions();

    // Step 3: Publishers & Vehicles
    const publisherIds = await seedPublishersAndVehicles(orgIds);

    // Step 4: Screens & Groups
    const screenIdMap = await seedScreensAndGroups(orgIds, publisherIds);

    // Step 5: Campaigns, Bookings, Flights, Creatives
    const campaignData = await seedCampaignsFlightsTargeting(orgIds, screenIdMap);

    // Step 6: Players & Heartbeats
    const playerIdMap = await seedPlayersAndHeartbeats(screenIdMap);

    // Step 7: Play Events
    await seedPlayEvents(screenIdMap, playerIdMap, campaignData);

    // Step 8: Screen Location History (GPS Mobility Data)
    await seedScreenLocationHistory(screenIdMap, playerIdMap);

    // Final Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SEEDING COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📊 Summary:");
    console.log(`   • Organisations: ${counts.organisations}`);
    console.log(`   • Users: ${counts.users}`);
    console.log(`   • Publisher Profiles: ${counts.publisherProfiles}`);
    console.log(`   • Vehicles: ${counts.vehicles}`);
    console.log(`   • Regions: ${counts.regions}`);
    console.log(`   • Screens: ${counts.screens}`);
    console.log(`   • Screen Groups: ${counts.screenGroups}`);
    console.log(`   • Campaigns: ${counts.campaigns}`);
    console.log(`   • Bookings: ${counts.bookings}`);
    console.log(`   • Flights: ${counts.flights}`);
    console.log(`   • Creatives: ${counts.creatives}`);
    console.log(`   • Players: ${counts.players}`);
    console.log(`   • Heartbeats: ${counts.heartbeats}`);
    console.log(`   • Play Events: ${counts.playEvents}`);
    console.log(`   • Location History: ${counts.screenLocationHistory}`);

    console.log("\n🎯 Storylines:");
    console.log("   1. Adidas UK - 3 campaigns (past, active, future)");
    console.log("   2. iFitness Lekki - 1 active local campaign");
    console.log("   3. LagosCabs & Capital OOH - Publisher networks");

    console.log("\n🔑 Login Credentials:");
    console.log("   • admin@beamer.com / demo123 (Internal Admin)");
    console.log("   • marketing@adidas.co.uk / demo123 (Adidas Advertiser)");
    console.log("   • admin@ifitness.ng / demo123 (iFitness Advertiser)");

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

run();
