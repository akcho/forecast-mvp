'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Button } from '@tremor/react';
import { createClient } from '@supabase/supabase-js';

export default function DebugConnectionsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllConnections();
  }, []);

  const loadAllConnections = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setConnections(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const shareConnection = async (connectionId: number) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error } = await supabase
        .from('quickbooks_connections')
        .update({ 
          is_shared: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) {
        throw error;
      }

      alert('Connection shared successfully!');
      loadAllConnections(); // Reload to show updated status
    } catch (err) {
      alert('Error sharing connection: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Text>Loading connections...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <Title className="text-red-800">Error</Title>
          <Text className="text-red-600">{error}</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Title className="text-2xl font-bold mb-6">Debug: All QuickBooks Connections</Title>
      
      {connections.length === 0 ? (
        <Card>
          <Text>No connections found in database</Text>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <Card key={connection.id} className="p-4">
              <div className="space-y-2">
                <Title className="text-lg">Connection #{connection.id}</Title>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>User ID:</strong> {connection.user_id}</div>
                  <div><strong>Company ID:</strong> {connection.company_id}</div>
                  <div><strong>Realm ID:</strong> {connection.realm_id}</div>
                  <div><strong>Company Name:</strong> {connection.company_name || 'N/A'}</div>
                  <div><strong>Is Active:</strong> {connection.is_active ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Is Shared:</strong> {connection.is_shared ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Is Service Account:</strong> {connection.is_service_account ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Created:</strong> {new Date(connection.created_at).toLocaleString()}</div>
                  <div><strong>Last Used:</strong> {new Date(connection.last_used_at).toLocaleString()}</div>
                </div>
                
                {!connection.is_shared && (
                  <Button 
                    size="xs"
                    onClick={() => shareConnection(connection.id)}
                    className="mt-2"
                  >
                    Share This Connection
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <Button 
        onClick={loadAllConnections}
        className="mt-4"
      >
        Refresh
      </Button>
    </div>
  );
}