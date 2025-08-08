import { NextRequest, NextResponse } from 'next/server';
import { 
  createAccessRequest, 
  getPendingAccessRequests, 
  approveAccessRequest, 
  denyAccessRequest,
  getAllUserPermissions,
  revokeUserPermission,
  isUserAdmin 
} from '@/lib/quickbooks/accessRequests';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'pending') {
      const requests = await getPendingAccessRequests();
      return NextResponse.json({ success: true, requests });
    }

    if (action === 'permissions') {
      const permissions = await getAllUserPermissions();
      return NextResponse.json({ success: true, permissions });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling GET request:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        const accessRequest = await createAccessRequest(data.userEmail, data.userName);
        return NextResponse.json({ success: true, request: accessRequest });

      case 'approve':
        if (!data.requestId) {
          return NextResponse.json({ success: false, error: 'Request ID is required' }, { status: 400 });
        }
        
        // Check if user is admin
        const isAdmin = await isUserAdmin();
        if (!isAdmin) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }
        
        await approveAccessRequest(data.requestId, data.adminUserId);
        return NextResponse.json({ success: true });

      case 'deny':
        if (!data.requestId) {
          return NextResponse.json({ success: false, error: 'Request ID is required' }, { status: 400 });
        }
        
        // Check if user is admin
        const isAdminDeny = await isUserAdmin();
        if (!isAdminDeny) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }
        
        await denyAccessRequest(data.requestId, data.reason, data.adminUserId);
        return NextResponse.json({ success: true });

      case 'revoke':
        if (!data.userId) {
          return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }
        
        // Check if user is admin
        const isAdminRevoke = await isUserAdmin();
        if (!isAdminRevoke) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }
        
        await revokeUserPermission(data.userId, data.adminUserId);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error handling POST request:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}