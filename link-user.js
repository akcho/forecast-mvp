// Link your Google user to the company
// Run with: node link-user.js

async function linkUser() {
  try {
    console.log('🔗 Linking Google user to company...\n');
    
    // Create a temporary endpoint to link user to company
    const response = await fetch('http://localhost:3000/api/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'link_current_user_to_company',
        company_id: 'b20747f5-db9b-4e63-b662-b80a670a386d',
        role: 'admin'  // You connected QB, so you're the admin
      })
    });
    
    const result = await response.json();
    console.log('✅ User linking result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.log('\n⚠️ If you see authentication errors, you need to sign in to the app first in your browser');
      console.log('Visit: http://localhost:3000');
    }
    
  } catch (error) {
    console.error('❌ User linking failed:', error.message);
  }
}

linkUser();