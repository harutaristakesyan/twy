# File Upload CORS Workaround Options

You have **3 options** to fix the CORS issue without configuring S3 directly:

---

## Option 1: Backend Proxy Upload (Recommended Workaround) ⭐

**How it works:**

- File goes: Browser → Backend → S3
- Everything through `/api` proxy (no CORS issues!)
- Backend handles the S3 upload server-side

### Frontend Changes (Already Done!)

I've created `fileApiProxy.ts` which sends files through the backend:

```typescript
// Use this instead of fileApi
import { fileApiProxy } from '@/shared/api/fileApiProxy'

// Upload file (goes through backend)
const fileId = await fileApiProxy.uploadFile(file)
```

### Backend Changes Needed

Your backend needs a new endpoint: **POST /files/upload**

```typescript
// Pseudo-code for backend
POST /files/upload
- Accepts: multipart/form-data with 'file' field
- Process:
  1. Receive file from frontend
  2. Upload to S3 using AWS SDK (server-side, no CORS issues)
  3. Return fileId

Response:
{
  "data": {
    "fileId": "uuid",
    "fileName": "example.pdf",
    "contentType": "application/pdf",
    "contentLength": 12345
  }
}
```

### Switch to Proxy Upload

To use this workaround, just replace the import in your load components:

```typescript
// Change this:
import { fileApi } from '@/shared/api/fileApi'

// To this:
import { fileApiProxy } from '@/shared/api/fileApiProxy'

// Then use fileApiProxy.uploadFile() instead of fileApi.uploadFile()
```

**Pros:**

- ✅ No CORS configuration needed
- ✅ Works immediately
- ✅ More secure (backend validates files)
- ✅ Backend can add virus scanning, size limits, etc.

**Cons:**

- ❌ Backend handles file transfer (more load)
- ❌ Slower for large files
- ❌ Requires backend code changes

---

## Option 2: Development-Only Vite Proxy

Add S3 to your Vite proxy (development only):

```typescript
// vite.config.mts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://dev.twy.am',
        changeOrigin: true,
        secure: false,
      },
      // Add this:
      '/s3-proxy': {
        target: 'https://dev-twy-am-files-bucket.s3.us-east-1.amazonaws.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/s3-proxy/, ''),
      },
    },
  },
})
```

Then modify presigned URLs to use `/s3-proxy/` prefix in development.

**Pros:**

- ✅ Works in development

**Cons:**

- ❌ Won't work in production
- ❌ Hacky solution
- ❌ Have to modify URLs before upload

---

## Option 3: Browser Extension (Development Only)

Install a CORS bypass extension for Chrome/Firefox:

- Chrome: "Allow CORS: Access-Control-Allow-Origin"
- Firefox: "CORS Everywhere"

**Pros:**

- ✅ Instant fix for development
- ✅ No code changes

**Cons:**

- ❌ Only works on your machine
- ❌ Won't work in production
- ❌ Security risk if left enabled
- ❌ Not a real solution

---

## Recommended Approach

### For Immediate Testing (Today):

Use **Option 3** (browser extension) to test your load creation feature right away.

### For Proper Solution (Choose One):

**Best: Configure S3 CORS** (See `S3_CORS_SETUP.md`)

- Takes 2 minutes to configure
- Proper solution for production
- Best performance (direct to S3)

**Alternative: Backend Proxy** (Use `fileApiProxy.ts`)

- If you can't access AWS console
- If backend wants to validate/process files
- Slightly slower but more control

---

## Quick Implementation: Use Backend Proxy

To switch to backend proxy right now:

### 1. Update CreateLoadPage.tsx

```typescript
// Line 7: Change import
import { fileApiProxy } from '@/shared/api/fileApiProxy'

// Line 71: Change function call
const fileId = await fileApiProxy.uploadFile(file)
```

### 2. Update LoadEditModal.tsx

Same changes as above.

### 3. Ask Backend Team

Tell them you need a new endpoint:

```
POST /files/upload
Content-Type: multipart/form-data

FormData:
- file: (binary)
- fileName: "example.pdf"
- contentType: "application/pdf"
- size: "12345"

Response:
{
  "data": {
    "fileId": "uuid-here",
    "fileName": "example.pdf",
    "contentType": "application/pdf",
    "contentLength": 12345
  }
}
```

Backend should:

1. Receive the file
2. Upload to S3 using AWS SDK
3. Return fileId

---

## Summary

| Option            | Effort | Production Ready | Speed     |
| ----------------- | ------ | ---------------- | --------- |
| S3 CORS Config    | 5 min  | ✅ Yes           | ⚡ Fast   |
| Backend Proxy     | 30 min | ✅ Yes           | 🐢 Slower |
| Vite Proxy        | 10 min | ❌ Dev only      | ⚡ Fast   |
| Browser Extension | 1 min  | ❌ Dev only      | ⚡ Fast   |

**My recommendation:** Configure S3 CORS (proper solution) OR implement backend proxy (if you can't access AWS).
