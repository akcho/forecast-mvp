# Google OAuth Setup Instructions

## Overview
This application requires Google OAuth for user authentication. Follow these steps to set up Google OAuth properly.

## Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project**
   - Create a new project or select an existing one
   - Note: You can use any project name (e.g., "netflo-app")

3. **APIs** (No action needed)
   - You don't need to enable any specific APIs
   - Google OAuth 2.0 works out of the box for basic authentication
   - Skip the API Library entirely

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - If prompted, configure the OAuth consent screen first:
     - Choose "Internal" if this is for your organization only
     - Choose "External" if you want others to be able to sign in
     - Fill in required fields (app name, user support email, etc.)

5. **Configure OAuth Client**
   - Application type: "Web application"
   - Name: "Netflo Local Development" (or any name you prefer)
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

6. **Get Your Credentials**
   - After creating, you'll see your Client ID and Client Secret
   - Copy these values for the next step

## Step 2: Update Environment Variables

1. **Edit .env.local**
   Replace the placeholder values with your actual Google OAuth credentials:

   ```bash
   # Replace these values with your actual Google OAuth credentials
   GOOGLE_CLIENT_ID=your_actual_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_google_client_id_here
   ```

2. **Verify Other Settings**
   Make sure these are set correctly:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=super-secret-key-change-this-in-production
   ```

## Step 3: Test the Setup

1. **Start the Development Server**
   ```bash
   npm run dev
   ```

2. **Test Authentication Flow**
   - Navigate to `http://localhost:3000`
   - You should see "Continue with Google" button
   - Click the button - it should redirect to Google OAuth
   - Sign in with your Google account
   - After successful Google auth, you should be redirected to QuickBooks OAuth
   - Complete the QuickBooks connection

3. **Verify Multi-Company Features**
   - After connecting QB, you should be able to access the dashboard
   - If you have admin permissions, you should see company switching options

## Troubleshooting

### Common Issues

1. **"Google OAuth is not configured" Error**
   - This means the environment variables are not set properly
   - Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not empty
   - Restart your development server after changing .env.local

2. **"redirect_uri_mismatch" Error**
   - Check that `http://localhost:3000/api/auth/callback/google` is added to your Google OAuth redirect URIs
   - Make sure there are no extra spaces or characters

3. **"access_denied" Error**
   - User cancelled the OAuth flow, or
   - Your OAuth consent screen needs approval (if set to "External")

4. **Server Won't Start**
   - If you see an error about Google OAuth configuration when starting the server, it means the required environment variables are missing
   - The app will not start without proper Google OAuth setup

### Development vs Production

- **Development**: Use `http://localhost:3000` in your OAuth configuration
- **Production**: Update your Google OAuth settings to use your production domain
- **Security**: Always use strong, unique values for `NEXTAUTH_SECRET` in production

## Flow Summary

The complete authentication flow is:
1. User visits the app
2. **Must** sign in with Google first (required)
3. After Google auth, automatically redirected to QuickBooks OAuth
4. After QB connection, user can access the multi-company dashboard
5. Users can switch between companies they have access to

This ensures proper user identification and company-level data isolation.