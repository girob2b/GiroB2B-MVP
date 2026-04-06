const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const client = connectionString
  ? new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    });

const migrations = [
  '001_initial_schema.sql',
  '002_seed_categories.sql',
  '003_storage_buckets.sql',
  '004_unified_registration.sql',
  '005_onboarding_segments.sql',
  '006_suppliers_optional_location.sql',
  '007_fiscal_fields.sql',
  '008_search_suggestions.sql',
  '009_public_profile_layout.sql',
  '010_identity_level1_foundation.sql',
  '011_buyer_activation_and_inquiries.sql',
  '012_atomic_inquiry_creation.sql',
];

async function run() {
  if (!connectionString) {
    const missing = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"].filter(k => !process.env[k]);
    if (missing.length > 0) {
      console.error(
        `Missing database connection configuration. Set DATABASE_URL (recommended) or: ${missing.join(", ")}`
      );
      process.exit(1);
    }
  }

  await client.connect();
  console.log('Connected to Supabase DB.\n');

  // Tenta encontrar a pasta migrations relativa ao script ou absoluta (Docker)
  const baseDir = fs.existsSync('/app/supabase/migrations') 
    ? '/app/supabase/migrations' 
    : path.join(__dirname, 'supabase', 'migrations');

  console.log(`Looking for migrations in: ${baseDir}\n`);

  for (const file of migrations) {
    const filePath = path.join(baseDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP: ${file} not found at ${filePath}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running ${file}...`);
    try {
      await client.query(sql);
      console.log(`  OK\n`);
    } catch (err) {
      console.error(`  ERROR in ${file}:`);
      console.error(`  ${err.message}\n`);
    }
  }

  await client.end();
  console.log('Done.');
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
