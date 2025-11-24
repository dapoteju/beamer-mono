import "dotenv/config";
import { db } from "../src/db/client";
import { organisations, users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function seedAdminUser() {
  try {
    console.log("🌱 Seeding admin user...");

    let beamerOrg = await db
      .select()
      .from(organisations)
      .where(eq(organisations.name, "Beamer Internal"))
      .limit(1);

    let beamerOrgId: string;

    if (beamerOrg.length === 0) {
      console.log("Creating Beamer Internal organisation...");
      const [org] = await db
        .insert(organisations)
        .values({
          name: "Beamer Internal",
          type: "beamer_internal",
          billingEmail: "admin@beamer.com",
          country: "US",
        })
        .returning();
      beamerOrgId = org.id;
      console.log("✓ Beamer Internal organisation created:", beamerOrgId);
    } else {
      beamerOrgId = beamerOrg[0].id;
      console.log("✓ Beamer Internal organisation found:", beamerOrgId);
    }

    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@beamer.com"))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("✓ Admin user already exists");
      console.log("Email: admin@beamer.com");
      console.log("Password: beamer123");
      return;
    }

    const passwordHash = await bcrypt.hash("beamer123", SALT_ROUNDS);

    const [adminUser] = await db
      .insert(users)
      .values({
        email: "admin@beamer.com",
        passwordHash,
        fullName: "Super Admin",
        orgId: beamerOrgId,
        role: "admin",
        updatedAt: new Date(),
      })
      .returning();

    console.log("✓ Admin user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email: admin@beamer.com");
    console.log("🔑 Password: beamer123");
    console.log("👤 Name: Super Admin");
    console.log("🏢 Organisation: Beamer Internal");
    console.log("🛡️  Role: admin");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
    process.exit(1);
  }
}

seedAdminUser()
  .then(() => {
    console.log("✅ Seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
