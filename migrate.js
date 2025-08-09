// Simple script to run the data migration
// Run with: node migrate.js

async function runMigration() {
  try {
    console.log('🔄 Starting data migration...');
    
    const response = await fetch('http://localhost:3000/api/migrate-data/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Migration completed!');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

runMigration();