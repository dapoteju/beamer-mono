/**
 * Database Migration Script
 * 
 * This script migrates data from an old Replit database to the current one.
 * It handles:
 * - Schema differences (column mapping and renaming)
 * - Invalid JSON data sanitization
 * - Auto-generation of missing required fields (e.g., invoice numbers)
 * - Proper foreign key dependency ordering
 * 
 * Usage:
 *   Set OLD_DATABASE_URL environment variable with the source database connection string
 *   Run: npx ts-node scripts/migrate-old-data.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const OLD_DB_URL = process.env.OLD_DATABASE_URL || 'postgresql://neondb_owner:npg_uwchGAam6o4x@ep-late-heart-aft9oc7j.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
const NEW_DB_URL = process.env.DATABASE_URL;

if (!NEW_DB_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

if (!process.env.OLD_DATABASE_URL) {
  console.warn('⚠️  WARNING: OLD_DATABASE_URL not set, using hardcoded value (not recommended for production)');
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

      const oldColumns = await oldPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      const newColumns = await newPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      const oldColumnNames = oldColumns.rows.map(row => row.column_name);
      const newColumnNames = newColumns.rows.map(row => row.column_name);

      // Column mapping: maps old column names to new schema column names
      const columnMapping: Record<string, Record<string, string>> = {
        invoices: {
          'issue_date': 'issued_date',
          'amount_minor': 'total_amount',
        }
      };

      // Columns to skip: these exist in old schema but not in new schema
      const columnsToSkip: Record<string, string[]> = {
        invoices: ['advertiser_org_id', 'external_reference']
      };

      // Columns to add: these don't exist in old schema but are required in new schema
      // Values will be auto-generated during migration
      const columnsToAdd: Record<string, string[]> = {
        invoices: ['invoice_number']
      };

      const oldColumnsToFetch = oldColumnNames.filter(col => {
        const skip = columnsToSkip[tableName]?.includes(col);
        return !skip;
      });

      const mappedColumns = oldColumnsToFetch.map(oldCol => {
        const newCol = columnMapping[tableName]?.[oldCol] || oldCol;
        return { oldCol, newCol };
      }).filter(({ newCol }) => newColumnNames.includes(newCol));

      if (columnsToAdd[tableName]) {
        for (const colToAdd of columnsToAdd[tableName]) {
          if (newColumnNames.includes(colToAdd)) {
            mappedColumns.push({ oldCol: colToAdd, newCol: colToAdd });
          }
        }
      }

      const columnsToFetchFromOld = mappedColumns.filter(({ oldCol }) => oldColumnNames.includes(oldCol));
      const oldColumnsInQuery = columnsToFetchFromOld.map(({ oldCol }) => `"${oldCol}"`).join(', ');
      
      const newColumnList = mappedColumns.map(({ newCol }) => `"${newCol}"`).join(', ');
      const placeholders = mappedColumns.map((_, i) => `$${i + 1}`).join(', ');

      if (mappedColumns.length === 0) {
        console.log(`   ⚠️  No compatible columns found, skipping...`);
        continue;
      }

      const oldData = await oldPool.query(`SELECT ${oldColumnsInQuery} FROM "${tableName}"`);

      console.log(`   ⏳ Inserting records...`);
      
      let insertedCount = 0;
      let skippedCount = 0;

      for (let rowIndex = 0; rowIndex < oldData.rows.length; rowIndex++) {
        const row = oldData.rows[rowIndex];
        try {
          const values = mappedColumns.map(({ oldCol, newCol }) => {
            const valueFromDb = oldColumnNames.includes(oldCol) ? row[oldCol] : null;
            
            // Sanitize invalid JSON in creative_approvals.documents field
            // Some legacy data has malformed JSON that needs to be cleaned or nullified
            if (tableName === 'creative_approvals' && oldCol === 'documents' && valueFromDb !== null) {
              if (typeof valueFromDb === 'string') {
                try {
                  JSON.parse(valueFromDb);
                  return valueFromDb;
                } catch {
                  console.log(`      ⚠️  Invalid JSON in documents field, setting to null`);
                  return null;
                }
              } else if (typeof valueFromDb === 'object') {
                try {
                  JSON.stringify(valueFromDb);
                  return valueFromDb;
                } catch {
                  console.log(`      ⚠️  Invalid JSON object in documents field, setting to null`);
                  return null;
                }
              }
            }
            
            // Auto-generate invoice numbers for invoices that don't have them
            // Format: INV-YYYYMMDD-####
            if (tableName === 'invoices' && newCol === 'invoice_number') {
              if (valueFromDb) {
                return valueFromDb;
              }
              const issueDate = row['issue_date'] || row['issued_date'];
              const dateStr = issueDate ? new Date(issueDate).toISOString().split('T')[0].replace(/-/g, '') : 'MIGR';
              return `INV-${dateStr}-${(rowIndex + 1).toString().padStart(4, '0')}`;
            }
            
            return valueFromDb;
          });
          
          await newPool.query(
            `INSERT INTO "${tableName}" (${newColumnList}) VALUES (${placeholders}) 
             ON CONFLICT DO NOTHING`,
            values
          );
          insertedCount++;
        } catch (error: any) {
          if (error.code === '23505') {
            skippedCount++;
          } else if (error.code === '22P02') {
            console.error(`   ⚠️  Skipping record due to invalid data format:`, error.message);
            skippedCount++;
          } else {
            console.error(`   ❌ Error inserting record:`, error.message);
            console.error(`   Record data:`, JSON.stringify(row, null, 2));
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
