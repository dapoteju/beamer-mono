import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const OLD_DB_URL = 'postgresql://neondb_owner:npg_uwchGAam6o4x@ep-late-heart-aft9oc7j.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
const NEW_DB_URL = process.env.DATABASE_URL;

if (!NEW_DB_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

async function migrateData() {
  const oldPool = new Pool({ connectionString: OLD_DB_URL });
  const newPool = new Pool({ connectionString: NEW_DB_URL });

  try {
    console.log('🚀 Starting database migration...\n');

    const tablesToMigrate = [
      'organisations',
      'regions',
      'users',
      'screens',
      'campaigns',
      'creatives',
      'bookings',
      'creative_approvals',
      'booking_flights',
      'flights',
      'invoices',
      'invoice_line_items',
      'player_logs',
      'reports_daily',
    ];

    for (const tableName of tablesToMigrate) {
      console.log(`\n📦 Migrating table: ${tableName}`);
      console.log('─'.repeat(50));

      const tableExists = await newPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      if (!tableExists.rows[0].exists) {
        console.log(`   ⚠️  Table ${tableName} doesn't exist in new database, skipping...`);
        continue;
      }

      const oldTableExists = await oldPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      if (!oldTableExists.rows[0].exists) {
        console.log(`   ⚠️  Table ${tableName} doesn't exist in old database, skipping...`);
        continue;
      }

      const countResult = await oldPool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const recordCount = parseInt(countResult.rows[0].count);

      if (recordCount === 0) {
        console.log(`   ℹ️  No records to migrate`);
        continue;
      }

      console.log(`   📊 Found ${recordCount} records`);

      const columns = await oldPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      const columnNames = columns.rows.map(row => row.column_name);
      const columnList = columnNames.map(name => `"${name}"`).join(', ');
      const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');

      const oldData = await oldPool.query(`SELECT ${columnList} FROM "${tableName}"`);

      console.log(`   ⏳ Inserting records...`);
      
      let insertedCount = 0;
      let skippedCount = 0;

      for (const row of oldData.rows) {
        try {
          const values = columnNames.map(col => row[col]);
          
          await newPool.query(
            `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders}) 
             ON CONFLICT DO NOTHING`,
            values
          );
          insertedCount++;
        } catch (error: any) {
          if (error.code === '23505') {
            skippedCount++;
          } else {
            console.error(`   ❌ Error inserting record:`, error.message);
            throw error;
          }
        }
      }

      console.log(`   ✅ Inserted: ${insertedCount} records`);
      if (skippedCount > 0) {
        console.log(`   ⏭️  Skipped: ${skippedCount} records (already exist)`);
      }
    }

    console.log('\n\n🎉 Migration completed successfully!');
    console.log('═'.repeat(50));

    console.log('\n📊 Final summary:');
    for (const tableName of tablesToMigrate) {
      const tableExists = await newPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      if (tableExists.rows[0].exists) {
        const count = await newPool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        console.log(`   ${tableName}: ${count.rows[0].count} records`);
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

migrateData().catch(console.error);
