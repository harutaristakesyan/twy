# Files API Guide

The files API allows authenticated clients to upload binary assets to S3 and
later remove them by identifier. All endpoints require JWT authorization and use
`application/json` payloads.

Base URL for the functions stack:

```
https://<api-domain>/api
```

## Upload File

- **Method**: `POST /files`
- **Description**: Request a short-lived, presigned S3 upload URL. The backend
  returns the URL, headers, and identifiers to complete the upload from the
  browser or another client.
- **Request Body**:

```json
{
  "fileName": "example.pdf",
  "contentType": "application/pdf",
  "size": 524288
}
```

### Front-end flow

1. Collect the file metadata locally:
   ```ts
   const file = input.files?.[0];
   const payload = {
     fileName: file.name,
     contentType: file.type,
     size: file.size,
   };
   ```
2. Call `POST /files` with the payload above.
3. Receive a response similar to the example below. The `uploadUrl` expires
   after 15 minutes (configurable via `FILE_UPLOAD_URL_TTL_SECONDS`).
4. Upload the file directly to S3 using `fetch`, `axios`, or `XMLHttpRequest`.
   The only required header is the `Content-Type` returned by the API. The
   request body should be the raw binary `Blob`/`File` object.

```ts
const response = await fetch("/api/files", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const uploadContract = await response.json();

await fetch(uploadContract.uploadUrl, {
  method: "PUT",
  headers: uploadContract.requiredHeaders,
  body: file,
});
```

- **Successful Response**: `200 OK`

```json
{
  "fileId": "b3f1d5c5-0f3c-4a94-8d6c-9b21349291ce",
  "bucket": "my-files-bucket",
  "key": "b3f1d5c5-0f3c-4a94-8d6c-9b21349291ce",
  "uploadUrl": "https://my-files-bucket.s3.us-east-1.amazonaws.com/b3f1d5c5-0f3c-4a94-8d6c-9b21349291ce?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
  "expiresAt": "2025-02-17T14:28:22.123Z",
  "requiredHeaders": {
    "Content-Type": "application/pdf"
  },
  "fileName": "example.pdf",
  "contentType": "application/pdf",
  "contentLength": 524288
}
```

Persist the returned `fileId` if you need to delete the object later. The
object is not available until the client successfully uploads the file to the
returned `uploadUrl`.

## Get Download URL

- **Method**: `GET /files/{fileId}`
- **Description**: Generate a short-lived, presigned S3 download URL for a previously uploaded file.
- **Path Parameters**:
  - `fileId` – UUID returned from the upload response.
- **Front-end flow**:

1. Call `GET /files/{fileId}` with the fileId of the file you want to download.
2. Receive a response with the `downloadUrl` and `expiresAt` timestamp.
3. Download the file directly from S3 using `fetch`, `axios`, or a direct link.

```ts
const response = await fetch(`/api/files/${fileId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${jwt}`,
  },
});

const downloadContract = await response.json();

// Download the file
const fileResponse = await fetch(downloadContract.downloadUrl);
const blob = await fileResponse.blob();

// Save or process the blob as needed
```

- **Successful Response**: `200 OK`

```json
{
  "downloadUrl": "https://my-files-bucket.s3.us-east-1.amazonaws.com/b3f1d5c5-0f3c-4a94-8d6c-9b21349291ce?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
  "expiresAt": "2025-02-17T15:28:22.123Z"
}
```

The download URL expires after **1 hour** (configurable via `DEFAULT_DOWNLOAD_URL_TTL_SECONDS`).

## Delete File

- **Method**: `DELETE /files/{fileId}`
- **Description**: Remove a previously uploaded file using its identifier.
- **Path Parameters**:
  - `fileId` – UUID returned from the upload response.
- **Successful Response**: `200 OK`

```json
{
  "message": "File deleted successfully"
}
```

Deletion is idempotent; calling the endpoint for a missing file results in the
same success response once S3 confirms the delete request.
