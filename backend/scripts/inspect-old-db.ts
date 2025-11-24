import { Pool } from 'pg';

const OLD_DB_URL = 'postgresql://neondb_owner:npg_uwchGAam6o4x@ep-late-heart-aft9oc7j.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function inspectOldDatabase() {
  const pool = new Pool({
    connectionString: OLD_DB_URL,
  });

  try {
    console.log('🔍 Connecting to old database...\n');

    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📊 Tables found in old database:');
    console.log('================================\n');
    
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      console.log(`\n📋 Table: ${tableName}`);
      console.log('----------------------------');

      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const count = countResult.rows[0].count;
      console.log(`   Records: ${count}`);

      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.log('   Columns:');
      for (const col of columnsResult.rows) {
        console.log(`     - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      }

      if (count > 0 && count <= 5) {
        console.log('\n   Sample data:');
        const sampleResult = await pool.query(`SELECT * FROM "${tableName}" LIMIT 3`);
        console.log(JSON.stringify(sampleResult.rows, null, 2));
      }
    }

    console.log('\n\n✅ Inspection complete!');

  } catch (error) {
    console.error('❌ Error inspecting database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

inspectOldDatabase();
