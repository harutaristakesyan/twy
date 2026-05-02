# Mock API - Quick Start Guide

## 🚀 Enable Mock APIs (3 Ways)

### Option 1: Direct Config (Simplest)

Edit `src/shared/api/mockConfig.ts`:

```typescript
ENABLE_MOCK_API: true,  // Change to true
```

### Option 2: Environment Variable (Recommended)

Create `.env.development`:

```bash
VITE_ENABLE_MOCKS=true
VITE_MOCK_DELAY=500
```

### Option 3: Temporarily in Code

```typescript
// Just for testing, change back after
ENABLE_MOCK_API: true || import.meta.env.VITE_ENABLE_MOCKS === 'true',
```

## ✅ Verify It's Working

1. Run your app
2. Look for console message: `🎭 Mock API is enabled`
3. See orange badge in bottom-right: `🎭 MOCK MODE`
4. Click badge to see config in console

## 📝 What You Can Do

### Works Right Now (Users)

- ✅ Get all users
- ✅ Create user
- ✅ Update user
- ✅ Delete user
- ✅ Get user by ID
- ✅ Self-update profile

### Example Usage

```typescript
// In your component - no changes needed!
const users = await getUsers() // Returns mock users
const newUser = await createUser(data) // Creates in mock store
await deleteUser('1') // Deletes from mock store
```

## 🎯 Key Features

- **Persistent**: Mock data survives across page navigation (resets on refresh)
- **Real CRUD**: Create/Update/Delete actually modify the mock data
- **Network Delay**: Simulates real API with 500ms delay
- **Visual Indicator**: Orange badge shows when mocks are active
- **Console Logs**: See `🎭 Mock GET /api/users` for each request

## 📦 Default Mock Data

4 mock users included:

1. John Doe - Owner (Main Branch) ✅ Active
2. Jane Smith - Accountant (Main Branch) ✅ Active
3. Bob Johnson - Agent (Secondary Branch) ❌ Inactive
4. Alice Williams - Carrier (Regional Branch) ✅ Active

## 🔧 Configure Specific Endpoints

Edit `mockConfig.ts`:

```typescript
endpoints: {
  users: true,     // ✅ Mock
  branches: false, // ❌ Use real API
  loads: true,     // ✅ Mock
}
```

## 🛑 Disable Mock APIs

### Quick Disable:

```typescript
ENABLE_MOCK_API: false,
```

### Or in .env.development:

```bash
VITE_ENABLE_MOCKS=false
```

## 🐛 Troubleshooting

| Problem                | Solution                                        |
| ---------------------- | ----------------------------------------------- |
| Not seeing mock data   | Check console for `🎭 Mock API is enabled`      |
| Still hitting real API | Verify `ENABLE_MOCK_API: true` in mockConfig.ts |
| No orange badge        | Mocks are disabled                              |
| Data resets            | Normal behavior - mocks reset on page refresh   |

## 📚 Full Documentation

See `MOCK_API_GUIDE.md` for complete documentation including:

- Adding new endpoints
- Architecture details
- Advanced configuration
- Best practices

## 💡 Pro Tips

1. **Development**: Set `VITE_ENABLE_MOCKS=true` in `.env.development`
2. **Testing**: Keep mocks enabled to test UI without backend
3. **Backend Ready**: Disable specific endpoints as they become available
4. **Console**: Click the `🎭 MOCK MODE` badge to inspect config
5. **Production**: Mocks are automatically disabled in production builds

---

**Current Status**: Mock APIs are `DISABLED` by default. Enable them to start using mock data! 🎭
