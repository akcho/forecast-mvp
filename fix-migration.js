// Fix the migration - handle "default_company" string values
// Run with: node fix-migration.js

async function fixMigration() {
  try {
    console.log('🔧 Fixing migration for existing connections...\n');
    
    // First, let's directly call the Supabase database to see what we have
    console.log('Step 1: Creating proper migration endpoint...');
    
    const response = await fetch('http://localhost:3000/api/migrate-data/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force_migrate_default_company: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Migration result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

fixMigration();