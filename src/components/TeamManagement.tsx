'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, Title, Text, Button, TextInput, Badge, Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@tremor/react';
import { PlusIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'admin' | 'viewer';
  joined_at: string;
}

interface TeamManagementProps {
  companyId: string;
  companyName: string;
}

export function TeamManagement({ companyId, companyName }: TeamManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'viewer'>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (companyId) {
      fetchUsers();
    }
  }, [companyId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users?company_id=${companyId}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    try {
      setAddingUser(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail.trim().toLowerCase(),
          companyId,
          role: newUserRole
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setNewUserEmail('');
        setNewUserRole('viewer');
        await fetchUsers(); // Refresh the list
      } else {
        setError(data.error || 'Failed to add user');
      }
    } catch (err) {
      setError('Failed to add user');
      console.error('Error adding user:', err);
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from this company?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?user_id=${userId}&company_id=${companyId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Removed ${userEmail} from company`);
        await fetchUsers(); // Refresh the list
      } else {
        setError(data.error || 'Failed to remove user');
      }
    } catch (err) {
      setError('Failed to remove user');
      console.error('Error removing user:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <Text>Loading team members...</Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <Title>Team Management</Title>
        <Text className="mt-2">Manage who has access to {companyName}</Text>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <Text className="text-red-800 dark:text-red-400">{error}</Text>
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <Text className="text-green-800 dark:text-green-400">{success}</Text>
          </div>
        )}

        {/* Add User Form */}
        <form onSubmit={handleAddUser} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <TextInput
                placeholder="Enter email address"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                type="email"
                required
              />
            </div>
            <div>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'viewer')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <Button
            type="submit"
            loading={addingUser}
            icon={PlusIcon}
            className="w-full md:w-auto"
          >
            Add Team Member
          </Button>
        </form>

        {/* Users Table */}
        <div className="mt-8">
          <Title>Current Team Members ({users.length})</Title>
          
          {users.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <Text className="text-gray-500 dark:text-gray-400">No team members yet</Text>
            </div>
          ) : (
            <Table className="mt-4">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>User</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Joined</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name || user.email}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                        <div>
                          <Text className="font-medium">{user.name || user.email}</Text>
                          {user.name && (
                            <Text className="text-sm text-gray-500 dark:text-gray-400">{user.email}</Text>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color={user.role === 'admin' ? 'blue' : 'gray'}>
                        {user.role === 'admin' ? 'Admin' : 'Viewer'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Text>{formatDate(user.joined_at)}</Text>
                    </TableCell>
                    <TableCell>
                      {user.id !== session?.user?.dbId && (
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          icon={TrashIcon}
                          onClick={() => handleRemoveUser(user.id, user.email)}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <Text className="text-sm text-blue-800 dark:text-blue-400">
            <strong>How it works:</strong> Users must first sign up with Google OAuth before you can add them. 
            Share their email address and ask them to visit the site first, then add them here.
          </Text>
        </div>
      </Card>
    </div>
  );
}