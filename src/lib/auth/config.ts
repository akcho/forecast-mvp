import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Validate required Google OAuth environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    'Google OAuth configuration is required for this application. ' +
    'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables. ' +
    'Get these from https://console.cloud.google.com/'
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email && user.name) {
        try {
          const supabase = getSupabaseClient();
          
          // Upsert user in our database
          const { data, error } = await supabase
            .from('users')
            .upsert({
              email: user.email,
              google_id: user.id,
              name: user.name,
            }, {
              onConflict: 'email'
            })
            .select()
            .single();
          
          if (error) {
            console.error('Error upserting user:', error);
            return false;
          }
          
          // Add the database user ID to the session
          user.dbId = data.id;
          
          return true;
        } catch (error) {
          console.error('SignIn callback error:', error);
          return false;
        }
      }
      return false;
    },
    async jwt({ token, user }) {
      // Persist the OAuth user ID and database ID to the token
      if (user) {
        token.dbId = user.dbId;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.dbId) {
        session.user.dbId = token.dbId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};