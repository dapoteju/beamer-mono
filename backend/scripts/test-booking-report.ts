/**
 * Test script for booking reports endpoint
 * Creates test data and verifies the endpoint returns valid JSON
 */

import { db } from "../src/db";
import { campaigns, bookings, organisations } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function testBookingReport() {
  console.log("🧪 Testing Booking Reports Endpoint\n");

  try {
    // Step 1: Find or create a test organization
    console.log("1️⃣  Checking for test organization...");
    let org = await db
      .select()
      .from(organisations)
      .where(eq(organisations.name, "Test Advertiser"))
      .limit(1);

    let orgId: string;
    if (org.length === 0) {
      console.log("   Creating test organization...");
      const newOrg = await db
        .insert(organisations)
        .values({
          name: "Test Advertiser",
          type: "advertiser",
          billingEmail: "test@example.com",
          country: "US",
        })
        .returning();
      orgId = newOrg[0].id;
      console.log(`   ✅ Created organization: ${orgId}`);
    } else {
      orgId = org[0].id;
      console.log(`   ✅ Using existing organization: ${orgId}`);
    }

    // Step 2: Create a test campaign
    console.log("\n2️⃣  Creating test campaign...");
    const testCampaignId = crypto.randomUUID();
    const campaign = await db
      .insert(campaigns)
      .values({
        id: testCampaignId,
        advertiserOrgId: orgId,
        name: "Test Campaign for Booking Report",
        objective: "Brand Awareness",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        totalBudget: 100000,
        currency: "USD",
        status: "active",
      })
      .returning();

    const campaignId = campaign[0].id;
    console.log(`   ✅ Created campaign: ${campaignId}`);

    // Step 3: Create a test booking
    console.log("\n3️⃣  Creating test booking...");
    const booking = await db
      .insert(bookings)
      .values({
        advertiserOrgId: orgId,
        campaignId: campaignId,
        startDate: "2025-01-01",
        endDate: "2025-03-31",
        currency: "USD",
        billingModel: "CPM",
        rate: 500,
        agreedImpressions: 50000,
        agreedAmountMinor: 2500000,
        status: "confirmed",
      })
      .returning();

    const bookingId = booking[0].id;
    console.log(`   ✅ Created booking: ${bookingId}`);

    // Step 4: Test the booking report endpoint
    console.log("\n4️⃣  Testing GET /api/reports/bookings/:id");
    console.log(`   Booking ID: ${bookingId}`);
    
    const response = await fetch(`http://localhost:3000/api/reports/bookings/${bookingId}`);
    const statusCode = response.status;
    const data = await response.json();

    console.log(`   Status Code: ${statusCode}`);
    
    if (statusCode === 200) {
      console.log("   ✅ SUCCESS! Endpoint returned 200 OK");
      console.log("\n📊 Report Data:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("   ❌ FAILED! Expected 200, got", statusCode);
      console.log("   Response:", JSON.stringify(data, null, 2));
    }

    // Step 5: Test with non-existent booking
    console.log("\n5️⃣  Testing 404 handling with non-existent booking...");
    const notFoundResponse = await fetch(
      `http://localhost:3000/api/reports/bookings/00000000-0000-0000-0000-000000000000`
    );
    const notFoundStatus = notFoundResponse.status;
    const notFoundData = await notFoundResponse.json();

    if (notFoundStatus === 404) {
      console.log("   ✅ SUCCESS! Correctly returned 404 for non-existent booking");
      console.log("   Response:", JSON.stringify(notFoundData, null, 2));
    } else {
      console.log("   ❌ FAILED! Expected 404, got", notFoundStatus);
    }

    // Cleanup
    console.log("\n6️⃣  Cleaning up test data...");
    await db.delete(bookings).where(eq(bookings.id, bookingId));
    await db.delete(campaigns).where(eq(campaigns.id, campaignId));
    console.log("   ✅ Test data cleaned up");

    console.log("\n✅ All tests completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testBookingReport();
