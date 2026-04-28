# Role-Based Permissions Implementation

## Overview

A complete role-based access control (RBAC) system has been implemented to control what users can see and do based on their role.

## Roles and Permissions

### Head Owner

- **Access**: Users, Branches, Loads
- **Description**: Full access to the entire platform (system setup, all branches, accounting, load management, etc.)

### Head Accountant

- **Access**: Users, Branches, Loads
- **Description**: Full access to accounting-related modules (invoices, payments, reports, etc.) at Head Office level and branch level

### Owner

- **Access**: Users, Loads
- **Description**: Full access to the entire functionality within a specific branch

### Accountant

- **Access**: Loads
- **Description**: Handles accounting within the branch

### Agent

- **Access**: Loads
- **Description**: Reviews and manages loads posted by Carriers of that branch

### Carrier

- **Access**: Loads
- **Description**: Posts loads under their specific branch and can edit

## Implementation Details

### Files Created/Modified

1. **`src/shared/utils/permissions.ts`** (New)
   - Defines menu features and action permissions
   - Contains `MENU_PERMISSIONS` mapping for each role
   - Provides utility functions:
     - `hasMenuAccess()` - Check menu visibility
     - `hasLoadPermission()` - Check load action permissions
     - `hasUserPermission()` - Check user management permissions
     - `hasBranchPermission()` - Check branch management permissions

2. **`src/shared/hooks/useCurrentUser.ts`** (New)
   - React hook to fetch and access current logged-in user
   - Provides `user`, `loading`, `error`, and `refetch` states
   - Caches user data across components

3. **`src/auth/RoleBasedRoute.tsx`** (New)
   - Route protection component
   - Checks if user has access to required feature
   - Shows loading spinner while fetching user
   - Redirects to home if access denied

4. **`src/app/layouts/Sidebar.tsx`** (Modified)
   - Filters menu items based on user role
   - Only shows menus user has access to

5. **`src/app/routes/router.tsx`** (Modified)
   - Wraps protected routes with `RoleBasedRoute`
   - Applies role-based access control to:
     - `/` (Users)
     - `/branches` (Branches)
     - `/loads` (Loads)
     - `/loads/create` (Create Load)

6. **`src/shared/api/mockInterceptor.ts`** (Modified)
   - Changed default logged-in user from ID '1' (Owner) to ID '5' (Head Owner)
   - This allows testing of full access across all features

## Testing the System

To test different roles, modify the mock interceptor or update the user ID in your authentication flow:

**Mock Store User IDs:**

- ID '1': Owner (Users, Loads)
- ID '2': Head Accountant (Users, Branches, Loads)
- ID '3': Agent (Loads)
- ID '4': Carrier (Loads)
- ID '5': Head Owner (Users, Branches, Loads) - Currently active
- ID '6': Accountant (Loads)

## Menu Visibility

| Role            | Users | Branches | Loads |
| --------------- | ----- | -------- | ----- |
| Head Owner      | ✅    | ✅       | ✅    |
| Head Accountant | ✅    | ✅       | ✅    |
| Owner           | ✅    | ❌       | ✅    |
| Accountant      | ❌    | ❌       | ✅    |
| Agent           | ❌    | ❌       | ✅    |
| Carrier         | ❌    | ❌       | ✅    |

## Future Enhancements

The permission system is extensible. You can:

1. Add more granular permissions within features
2. Implement resource-level permissions (e.g., edit only own loads)
3. Add more menu features as needed
4. Extend to page-level and component-level permissions

## Usage Examples

### In Components

```typescript
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { hasLoadPermission, ActionPermission } from '@/shared/utils/permissions'

const MyComponent = () => {
  const { user } = useCurrentUser()

  const canDeleteLoad = hasLoadPermission(user?.role, ActionPermission.DELETE)

  return (
    <Button danger disabled={!canDeleteLoad}>
      Delete Load
    </Button>
  )
}
```

### In Routes

```typescript
import RoleBasedRoute from '@/auth/RoleBasedRoute'
import { MenuFeature } from '@/shared/utils/permissions'

<RoleBasedRoute requiredFeature={MenuFeature.USERS}>
  <UsersPage />
</RoleBasedRoute>
```
