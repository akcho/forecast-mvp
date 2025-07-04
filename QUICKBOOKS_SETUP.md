# QuickBooks Connection Setup Guide

## Problem
QuickBooks requires admin permissions to connect apps to company data. Standard users get the error: "You need admin permissions to connect this app to your company."

## Solution
We've implemented a connection sharing system where the admin connects once and shares access with the team.

## Setup Instructions

### For Admin (You)

1. **Connect as Admin**
   - Go to the app (any page)
   - Click "Connect as Admin" 
   - Complete the QuickBooks OAuth flow
   - You'll be redirected back to the app

2. **Share Connection**
   - After connecting, you'll see a "Share Connection with Team" button
   - Click it to make the connection available to your cofounder
   - You'll see a success message

3. **Done!**
   - Your cofounder can now access QuickBooks data through your connection

### For Team Members (Your Cofounder)

1. **Wait for Admin Setup**
   - Ask you to connect and share the connection first

2. **Use Shared Connection**
   - Go to the app
   - You'll see "Shared QuickBooks Connection Available"
   - Click "Use Shared Connection"
   - You'll now have access to all financial data

3. **Access Data**
   - Navigate to the Analysis page to view P&L, Balance Sheet, Cash Flow
   - All data comes through the admin's authorized connection

## How It Works

- **Secure**: Only your QuickBooks credentials are used
- **Simple**: No additional QuickBooks permissions needed
- **Flexible**: You can revoke access anytime by disconnecting
- **Transparent**: Team members see they're using a shared connection

## Troubleshooting

- **Connection lost**: Admin needs to reconnect and reshare
- **No shared connection**: Admin hasn't shared yet
- **Permission errors**: Contact admin to check connection status

## Security Notes

- Only read-only access to financial data
- No ability to modify QuickBooks data
- Connection tokens are stored securely
- Admin maintains full control over access

## Next Steps

1. You connect as admin
2. Share the connection
3. Your cofounder uses the shared connection
4. Both can access financial analysis features

This approach is common in business applications and is the recommended way to handle QuickBooks access for teams. 