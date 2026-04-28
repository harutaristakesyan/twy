# Mock API System Guide

## Overview

The Mock API system allows you to develop and test your application without a backend by intercepting API calls and returning mock data. All CRUD operations work with an in-memory data store.

## Quick Start

### Enable Mock APIs

Open `src/shared/api/mockConfig.ts` and set:

```typescript
export const MOCK_CONFIG = {
  ENABLE_MOCK_API: true, // Change this to true
  MOCK_DELAY: 500, // Simulated network delay (ms)

  endpoints: {
    users: true, // Enable specific endpoints
    branches: true,
    loads: true,
  },
}
```

### Disable Mock APIs

Set `ENABLE_MOCK_API: false` to use the real API.

## Features

### ✅ Full CRUD Operations

- **Create**: POST requests add new items to mock store
- **Read**: GET requests retrieve mock data
- **Update**: PUT requests modify existing mock data
- **Delete**: DELETE requests remove items from mock store

### ✅ Persistent During Session

- Mock data persists across component re-renders
- Data survives page navigation within the app
- Resets on page refresh

### ✅ Realistic Behavior

- Simulated network delays
- Proper HTTP status codes (200, 201, 404, etc.)
- Error responses for invalid operations

### ✅ Console Logging

When mock APIs are enabled, you'll see logs like:

```
🎭 Mock API is enabled
🎭 Mock GET /api/users
🎭 Mock POST /api/users
```

## Configuration Options

### Global Toggle

```typescript
ENABLE_MOCK_API: true // Master switch
```

### Network Delay

```typescript
MOCK_DELAY: 500 // Milliseconds (0 for instant responses)
```

### Endpoint-Specific Control

```typescript
endpoints: {
  users: true,     // Mock user endpoints
  branches: false, // Use real API for branches
  loads: true,     // Mock loads endpoints
}
```

## Architecture

### Files

1. **mockConfig.ts** - Configuration and feature flags
2. **mockStore.ts** - In-memory data storage and CRUD logic
3. **mockInterceptor.ts** - Axios interceptor that handles requests
4. **ApiClient.ts** - Integrated with mock system

### Data Flow

```
Your Component
    ↓
API Call (e.g., createUser())
    ↓
Axios Request
    ↓
Mock Interceptor (checks if mocking enabled)
    ↓
Mock Store (if enabled) OR Real API (if disabled)
    ↓
Response to Component
```

## Supported Endpoints (Users)

### GET /api/users

Get all users

```typescript
const users = await getUsers()
```

### GET /api/users/:id

Get specific user

```typescript
const user = await getUserById('1')
```

### GET /api/users/me

Get current user profile

```typescript
const currentUser = await getCurrentUser()
```

### POST /api/users

Create new user

```typescript
const newUser = await createUser({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: UserRole.AGENT,
  branchId: 'branch1',
  isActive: true,
})
```

### PUT /api/users/:id

Update user (admin)

```typescript
const updated = await updateUser({
  id: '1',
  role: UserRole.OWNER,
  isActive: false,
})
```

### PUT /api/users/self

Self-update profile

```typescript
const updated = await selfUpdateUser({
  firstName: 'Jane',
  email: 'jane@example.com',
})
```

### DELETE /api/users/:id

Delete user

```typescript
await deleteUser('1')
```

## Default Mock Data

The system comes with 4 mock users:

- John Doe (Owner, Main Branch)
- Jane Smith (Accountant, Main Branch)
- Bob Johnson (Agent, Secondary Branch) - Inactive
- Alice Williams (Carrier, Regional Branch)

## Extending the System

### Adding New Endpoints (e.g., Branches)

1. **Add to config** (`mockConfig.ts`):

```typescript
endpoints: {
  users: true,
  branches: true,  // Add this
}
```

2. **Add data to store** (`mockStore.ts`):

```typescript
private branches: Branch[] = []

getBranches(): Branch[] {
  return [...this.branches]
}

createBranch(data: BranchFormData): Branch {
  // Implementation
}
```

3. **Add interceptor handler** (`mockInterceptor.ts`):

```typescript
// In handleRequest method
if (url.includes('/branches') && isMockEnabled('branches')) {
  return this.handleBranchesEndpoint(url, method, config)
}

// Add handler method
private static handleBranchesEndpoint(url: string, method: string, config: any) {
  if (method === 'GET' && url.match(/^\/api\/branches\/?$/)) {
    return this.createResponse({
      success: true,
      data: mockStore.getBranches()
    }, 200, config)
  }
  // ... more handlers
}
```

## Best Practices

### 1. Use for Development

Enable mocks when backend is unavailable or for rapid UI development.

### 2. Gradual Migration

Enable/disable specific endpoints as backend becomes available:

```typescript
endpoints: {
  users: false,    // Backend ready
  branches: true,  // Still mocking
}
```

### 3. Test with Real Data Shape

Ensure mock data matches your actual API response structure.

### 4. Reset Store When Needed

```typescript
import { mockStore } from '@/shared/api/mockStore'

// Reset to initial state
mockStore.reset()
```

### 5. Console Check

Always check console for mock status:

- `🎭 Mock API is enabled` - Mocks active
- `🔧 Mock API is disabled` - Using real API

## Troubleshooting

### Mocks Not Working?

1. Check `ENABLE_MOCK_API` is `true`
2. Check specific endpoint is enabled in `endpoints` config
3. Check console for `🎭` emoji logs
4. Verify URL pattern matches in interceptor

### Data Not Persisting?

- Mock data only persists during active session
- Page refresh resets to initial data
- This is by design for development

### Wrong Response Format?

- Check `createResponse` method in `mockInterceptor.ts`
- Ensure it matches your API's response structure

## Production

**⚠️ IMPORTANT**: Always set `ENABLE_MOCK_API: false` in production!

Consider using environment variables:

```typescript
export const MOCK_CONFIG = {
  ENABLE_MOCK_API: import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true',
  // ...
}
```

Then in `.env.development`:

```
VITE_ENABLE_MOCKS=true
```

## Summary

The mock API system provides a complete development environment without requiring a backend. It intercepts axios requests, manages in-memory data with full CRUD operations, and can be toggled on/off with a simple config change.

Perfect for:

- 🚀 Rapid prototyping
- 🧪 Testing UI flows
- 👨‍💻 Frontend development without backend dependencies
- 📚 Component demos and documentation
