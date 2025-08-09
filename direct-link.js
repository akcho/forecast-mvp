// Directly link your Google user to the company in the database
// Run with: node direct-link.js

async function directLink() {
  try {
    console.log('🔗 Directly linking Google user to company via database...\n');
    
    // We know from the logs:
    // Your Google user ID: 806cbdb2-ea88-4b87-8c55-93a8e9af596f
    // Company ID: b20747f5-db9b-4e63-b662-b80a670a386d
    
    const response = await fetch('http://localhost:3000/api/migrate-data/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'link_user_to_company',
        user_id: '806cbdb2-ea88-4b87-8c55-93a8e9af596f',
        company_id: 'b20747f5-db9b-4e63-b662-b80a670a386d',
        role: 'admin'
      })
    });
    
    const result = await response.json();
    console.log('✅ Direct linking result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Direct linking failed:', error.message);
  }
}

directLink();