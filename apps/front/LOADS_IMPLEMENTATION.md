# Loads Management Implementation

## Overview

Successfully implemented a complete Loads Management system with multi-step wizard forms and file upload functionality.

## What Was Created

### 1. Load Entity (`src/entities/load/`)

- **types.ts** - TypeScript interfaces for Load, CreateLoadDto, and UpdateLoadDto
- **api.ts** - API client functions (getAll, getById, create, update, delete)
- **index.ts** - Barrel exports

### 2. File Upload Utility (`src/shared/api/fileApi.ts`)

Complete file management system with:

- `requestUploadUrl()` - Get presigned S3 upload URL
- `uploadToS3()` - Upload file directly to S3
- `uploadFile()` - Complete upload flow (request URL + upload)
- `getDownloadUrl()` - Get presigned download URL
- `deleteFile()` - Delete file from S3
- `downloadFile()` - Download file to browser

### 3. Load Management Features (`src/features/load-management/`)

#### **CreateLoadPage.tsx** (`src/pages/CreateLoadPage.tsx`)

Seven-step wizard that captures the full Load payload as described in the Functions documentation:

1. Customer Information (customer, reference number, optional customer rate, contact name)
2. Carrier Information (optional carrier and payment method, optional carrier rate)
3. Service Information (service fee toggle, load type, service type, service given as, commodity)
4. Booking Information (booked as, sold as, weight, optional temperature)
5. Pick-up Location (city/zip, phone optional, carrier/name/address required)
6. Drop-off Location (city/zip, phone optional, carrier/name/address required)
7. Files (multiple uploads; stores `{ id, fileName }` pairs for the API)

Key behaviours:

- Nested Ant Design form fields align with backend `pickup` / `dropoff` objects
- Numeric fields are normalised to numbers or null before submission
- Optional strings become `null` when cleared to signal a field reset
- Uploaded files are tracked as `{ id, fileName }` objects and surfaced to the payload under `files`

#### **LoadEditModal.tsx**

Reuses the wizard flow for editing:

- Pre-populates the form with nested pickup/dropoff data
- Renders existing file attachments and supports removals
- Sends the complete payload (including empty `files` array) to honour the API contract

#### **LoadManagementTable.tsx**

Server-backed grid with:

- Integration against `/loads` pagination, search, and sorting (reference, status, createdAt, customer)
- Status column with workflow highlighting (Pending, Approved, Denied)
- Nested pickup/dropoff display
- Currency rendering for carrier/customer rates
- Edit/Delete actions per row
- Search input driving API query parameter rather than client-side filtering

### 4. Loads Page (`src/pages/LoadsPage.tsx`)

- Hosts the management table within the app layout
- Provides entrypoint button to the create flow

## Data Structure

### Load Payload Mapping

- `customer`, `referenceNumber`, `contactName` (required strings)
- `customerRate`, `carrierRate` (optional decimals; omitted or `null` clears existing values)
- `carrier`, `carrierPaymentMethod` (optional strings)
- `chargeServiceFeeToOffice` (boolean switch)
- `loadType`, `serviceType`, `serviceGivenAs`, `commodity`, `bookedAs`, `soldAs`, `weight` (required strings)
- `temperature` (optional string)
- `pickup` / `dropoff` objects:
  - `carrier`, `name`, `address` (required)
  - `cityZipCode`, `phone` (optional; emit `null` to clear)
- `files` array of `{ id, fileName }` items – aligns with the Files service contract
- Server-managed read-only fields: `branchId`, `status`, `statusChangedBy`, timestamps

### Status Workflow

- Enum stored in `LoadStatus` type: `Pending`, `Approved`, `Denied`
- Default status is `Pending`; `/loads/{id}/status` endpoint handles transitions and audit metadata

## API Integration

### Load Endpoints

- `GET /loads` – Paginated listing with optional `page`, `limit`, `sortField`, `sortOrder`, `query`
- `GET /loads/{loadId}` – Retrieve a single load with nested pickup/dropoff and files
- `POST /loads` – Create; accepts full payload (files optional)
- `PUT /loads/{loadId}` – Update; send only the fields you wish to change (empty `files` array detaches all attachments)
- `PATCH /loads/{loadId}/status` – Update workflow status (Pending ⇄ Approved ⇄ Denied)
- `DELETE /loads/{loadId}` – Remove load and join-table links (files remain available globally)

### File Endpoints

- `POST /files` - Request upload URL
- `GET /files/:fileId` - Get download URL
- `DELETE /files/:fileId` - Delete file

## Features Implemented

✅ Multi-step wizard form (7 steps)
✅ Form validation at each step
✅ Multiple file uploads to S3
✅ File management (upload, download, delete)
✅ CRUD operations (Create, Read, Update, Delete)
✅ Server-side search, sorting, and pagination
✅ Error handling and user feedback
✅ Loading states
✅ Confirmation dialogs for destructive actions

## Next Steps / Future Enhancements

As discussed, the following can be adjusted later:

1. Convert text fields to dropdowns for:
   - Customer (from existing customers)
   - Carrier (from existing carriers)
   - Load Type, Service Type, Service Given As, Commodity (predefined options)
   - Booked As, Sold As (predefined options)

2. Add autocomplete functionality for location fields

3. Add file preview functionality

4. Add bulk operations (bulk delete, export to CSV/Excel)

5. Add advanced filters and sorting

6. Add UI controls for the status change endpoint (Approve / Deny actions)

## File Structure

```
src/
├── entities/
│   └── load/
│       ├── types.ts
│       ├── api.ts
│       └── index.ts
├── features/
│   └── load-management/
│       ├── LoadCreateModal.tsx
│       ├── LoadEditModal.tsx
│       ├── LoadManagementTable.tsx
│       └── index.ts
├── shared/
│   └── api/
│       └── fileApi.ts
└── pages/
    └── LoadsPage.tsx
```

## Notes

- All files are properly typed with TypeScript
- No linter errors
- Follows existing project patterns (similar to user-management and branch-management)
- Uses Ant Design components consistently
- Proper error handling and user feedback
