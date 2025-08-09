// Check current database state
// Run with: node check-data.js

async function checkData() {
  try {
    console.log('🔍 Checking current database state...\n');
    
    // Check connections
    console.log('=== QuickBooks Connections ===');
    const connectionsResponse = await fetch('http://localhost:3000/api/quickbooks/connections');
    const connections = await connectionsResponse.json();
    console.log(JSON.stringify(connections, null, 2));
    
    // Check companies (we'll need to create an endpoint for this)
    console.log('\n=== Companies ===');
    const companiesResponse = await fetch('http://localhost:3000/api/companies');
    if (companiesResponse.ok) {
      const companies = await companiesResponse.json();
      console.log(JSON.stringify(companies, null, 2));
    } else {
      console.log('Companies endpoint not accessible (expected)');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkData();