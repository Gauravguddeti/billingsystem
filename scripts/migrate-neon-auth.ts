import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing in .env.local');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Adding neon_auth_id column to user_profiles...');
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS neon_auth_id TEXT UNIQUE;`;
    
    console.log('Migration complete. Added neon_auth_id to user_profiles.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
