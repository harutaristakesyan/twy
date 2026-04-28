# S3 CORS Configuration for File Uploads

## Issue

You're getting a `net::ERR_FAILED` error when uploading files to S3. This is because the S3 bucket needs CORS (Cross-Origin Resource Sharing) configuration to allow uploads from your frontend application.

## ⚠️ Important: Proxy vs Direct S3 Upload

**Your Vite proxy is configured for `/api` routes only:**

```javascript
proxy: {
  '/api': {
    target: 'https://dev.twy.am',
    changeOrigin: true,
    secure: false,
  },
}
```

**This means:**

- ✅ API calls to `/api/*` → Go through the proxy to `dev.twy.am`
- ❌ S3 uploads to `https://dev-twy-am-files-bucket.s3.amazonaws.com` → Go **directly to AWS** (bypass proxy)

**This is the CORRECT behavior!** File uploads should go directly to S3 for:

- Better performance (no backend bottleneck)
- Reduced backend load
- Faster uploads

**But it requires CORS configuration on S3** because the browser sees it as a different origin.

## File Upload Flow

Here's how the file upload process works:

```
┌─────────────┐
│   Browser   │
│ localhost:  │
│    5173     │
└──────┬──────┘
       │
       │ 1. POST /api/files (get presigned URL)
       │    ↓ Goes through Vite proxy
       ▼
┌─────────────┐
│  Backend    │
│ dev.twy.am  │
└──────┬──────┘
       │
       │ 2. Returns presigned S3 URL
       │
       ▼
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 3. PUT to S3 presigned URL
       │    ↓ BYPASSES proxy (direct to AWS)
       │    ↓ This is where CORS is needed!
       ▼
┌─────────────┐
│   AWS S3    │
│   Bucket    │
└─────────────┘
```

**Why CORS is needed:**

- Step 3 goes from `http://localhost:5173` → `https://s3.amazonaws.com`
- This is a cross-origin request
- S3 needs to explicitly allow it via CORS configuration

## Solution

### 1. AWS S3 Bucket CORS Configuration

Your S3 bucket (`dev-twy-am-files-bucket`) needs the following CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000", "https://your-production-domain.com"],
    "ExposeHeaders": ["ETag", "x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2. How to Apply CORS Configuration

#### Option A: AWS Console

1. Go to AWS S3 Console
2. Select your bucket: `dev-twy-am-files-bucket`
3. Go to **Permissions** tab
4. Scroll to **Cross-origin resource sharing (CORS)**
5. Click **Edit**
6. Paste the JSON configuration above
7. Click **Save changes**

#### Option B: AWS CLI

```bash
aws s3api put-bucket-cors \
  --bucket dev-twy-am-files-bucket \
  --cors-configuration file://cors-config.json
```

Where `cors-config.json` contains the JSON above.

#### Option C: CDK/CloudFormation (if using Infrastructure as Code)

If you're using AWS CDK, add this to your S3 bucket configuration:

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3'

const bucket = new s3.Bucket(this, 'FilesBucket', {
  cors: [
    {
      allowedHeaders: ['*'],
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE, s3.HttpMethods.HEAD],
      allowedOrigins: ['http://localhost:5173', 'http://localhost:3000', 'https://your-production-domain.com'],
      exposedHeaders: ['ETag', 'x-amz-server-side-encryption', 'x-amz-request-id', 'x-amz-id-2'],
      maxAge: 3000,
    },
  ],
})
```

### 3. Important Notes

1. **AllowedOrigins**:
   - Add your development origin: `http://localhost:5173` (Vite default)
   - Add your production domain when deploying
   - Do NOT use `*` (wildcard) in production for security reasons

2. **AllowedMethods**:
   - `PUT` is required for uploading files
   - `GET` is required for downloading files
   - `DELETE` is required for deleting files

3. **AllowedHeaders**:
   - Using `*` allows all headers (including Content-Type)
   - You can restrict this to specific headers if needed

4. **MaxAgeSeconds**:
   - Browser caches CORS preflight responses for this duration
   - 3000 seconds (50 minutes) is a reasonable value

### 4. Verify CORS Configuration

After applying the configuration, you can verify it works by:

1. Opening your browser's DevTools (F12)
2. Go to the Network tab
3. Try uploading a file
4. Look for the `OPTIONS` request (preflight) - it should return 200
5. The `PUT` request should also succeed

### 5. Additional Debugging

If the issue persists after CORS configuration:

1. **Check Presigned URL**: Ensure the backend is generating valid presigned URLs with the correct expiration time

2. **Check S3 Bucket Policy**: Ensure the bucket policy allows the necessary actions

3. **Check Network Tab**: Look at the actual error response from S3

4. **Browser Console**: Check for any additional CORS error messages

### 6. Development vs Production

For development:

```json
"AllowedOrigins": ["http://localhost:5173"]
```

For production, update to your actual domain:

```json
"AllowedOrigins": ["https://your-app.com"]
```

You can have multiple origins in the array for different environments.

## Current Error Details

```
PUT https://dev-twy-am-files-bucket.s3.us-east-1.amazonaws.com/...
net::ERR_FAILED
```

This error typically means:

- CORS is blocking the request (most likely)
- Or the presigned URL has expired
- Or there's a network issue

The CORS configuration above should resolve the issue.
