# Loads API Guide

This document describes the Load management endpoints exposed by the Functions
stack. All routes require a valid JWT authorizer context and accept or return
JSON payloads. Unless noted, requests should be sent with the
`Content-Type: application/json` header.

Base URL for the functions stack:

```
https://<api-domain>/api
```

All Load endpoints live under the `/loads` prefix.

## Common Data Shapes

### Load Status Values

The service recognizes the following workflow states:

- `Pending`
- `Approved`
- `Denied`

Loads are created with a default status of `Pending`.

### Load Payload

```json
{
  "customer": "<text>",
  "referenceNumber": "<text>",
  "customerRate": 1250.5,
  "contactName": "<contact>",
  "carrier": "<carrier name>",
  "carrierPaymentMethod": "Wire",
  "carrierRate": 980,
  "chargeServiceFeeToOffice": false,
  "loadType": "Full Truck Load",
  "serviceType": "Refrigerated",
  "serviceGivenAs": "Door to Door",
  "commodity": "Frozen goods",
  "bookedAs": "Standard",
  "soldAs": "Standard",
  "weight": "10000 lbs",
  "temperature": "-5C",
  "pickup": {
    "cityZipCode": "Austin, TX 73301",
    "phone": "(555) 010-1000",
    "carrier": "Carrier A",
    "name": "Warehouse A",
    "address": "123 Main St"
  },
  "dropoff": {
    "cityZipCode": "Dallas, TX 75201",
    "phone": "(555) 010-2000",
    "carrier": "Carrier B",
    "name": "Store B",
    "address": "456 Elm St"
  },
  "files": [
    { "id": "<existing-file-id>", "fileName": "proof-of-delivery.pdf" },
    { "id": "<new-file-id>", "fileName": "bill-of-lading.pdf" }
  ]
}
```

- `customer` is a free-form text field captured exactly as provided in the
  request.
- `carrier` is optional. Omit it when no carrier has been identified; when you
  do include it, the value must be non-empty text.
- `pickup.cityZipCode` and `dropoff.cityZipCode` are optional. When you omit
  them the API stores a `null` value and responses will reflect that.
- `pickup.carrier`, `pickup.name`, `pickup.address` and `dropoff.carrier`,
  `dropoff.name`, `dropoff.address` are required fields.
- `pickup.phone` and `dropoff.phone` are optional fields.
- `files` accepts objects that include both an `id` and `fileName`. When the
  referenced file does not exist yet, the API will create a record in the
  `file` table before linking it to the load. Behind the scenes the API writes
  to the `load_files` join table so you can attach multiple files to a single
  load.
- The branch is resolved automatically from the authenticated user's branch. If
  the user is not assigned to a branch the request is rejected.
- Optional numeric or text fields may be omitted or set to `null` to clear
  previously stored values.

### Load Response

```json
{
  "id": "<uuid>",
  "customer": "<text>",
  "referenceNumber": "REF-1001",
  "customerRate": 1250.5,
  "contactName": "Jane Smith",
  "carrier": "Carrier A",
  "carrierPaymentMethod": "Wire",
  "carrierRate": 980,
  "chargeServiceFeeToOffice": false,
  "loadType": "Full Truck Load",
  "serviceType": "Refrigerated",
  "serviceGivenAs": "Door to Door",
  "commodity": "Frozen goods",
  "bookedAs": "Standard",
  "soldAs": "Standard",
  "weight": "10000 lbs",
  "temperature": "-5C",
  "pickup": {
    "cityZipCode": "Austin, TX 73301",
    "phone": "(555) 010-1000",
    "carrier": "Carrier A",
    "name": "Warehouse A",
    "address": "123 Main St"
  },
  "dropoff": {
    "cityZipCode": "Dallas, TX 75201",
    "phone": "(555) 010-2000",
    "carrier": "Carrier B",
    "name": "Store B",
    "address": "456 Elm St"
  },
  "branchId": "<uuid>",
  "status": "Pending",
  "statusChangedBy": "ops.manager@example.com",
  "files": [{ "id": "<file-id>", "fileName": "bill-of-lading.pdf" }],
  "createdAt": "2025-01-22T18:27:11.102Z",
  "updatedAt": "2025-01-22T18:27:11.102Z"
}
```

When a carrier has not been captured for a load, the `carrier` property in
responses appears as `null`. The same behavior applies to missing pick-up or
drop-off city/zip values.

The `statusChangedBy` property returns the email address of the user who last
updated the status. When the system cannot resolve the user record, the field is
`null`.

## Endpoints

### List Loads

- **Method**: `GET /loads`
- **Description**: Retrieve a paginated list of load records filtered by an
  optional free-text search.
- **Query Parameters**:
  - `page` – zero-based page index (defaults to `0`).
  - `limit` – number of records per page (defaults to `10`).
  - `sortField` – one of `referenceNumber`, `status`, `createdAt`, `customer`
    (defaults to `createdAt`).
  - `sortOrder` – either `ascend` or `descend` (defaults to `descend`).
  - `query` – optional search string matched against the reference number,
    customer, contact name, carrier, or commodity.
- **Successful Response**: `200 OK`

```json
{
  "loads": [
    {
      "id": "ab4d2a07-0f92-4f97-96c0-9e0fdac50301",
      "customer": "Acme Corp",
      "referenceNumber": "REF-1001",
      "status": "Pending",
      "statusChangedBy": "ops.manager@example.com",
      "files": [
        {
          "id": "f3f9f50d-4e92-4c57-b719-2d4f78b4a6d1",
          "fileName": "bill-of-lading.pdf"
        }
      ],
      "createdAt": "2025-01-22T18:27:11.102Z",
      "updatedAt": "2025-01-22T18:27:11.102Z"
    }
  ],
  "total": 1
}
```

### Create Load

- **Method**: `POST /loads`
- **Description**: Create a new load record and optionally link uploaded files
  through the `load_files` table. Passing a file payload with `id` and
  `fileName` automatically registers the file in the Files catalog if it does
  not exist yet.
- **Request Body**: Use the _Load Payload_ shape. Omitting `files` creates the
  load without attachments.
- **Successful Response**: `201 Created`

```json
{
  "message": "Load created successfully",
  "loadId": "ab4d2a07-0f92-4f97-96c0-9e0fdac50301"
}
```

### Update Load

- **Method**: `PUT /loads/{loadId}`
- **Description**: Update any subset of load fields. Provide only the values you
  want to change; omitted properties remain untouched. Passing an empty array in
  `files` removes all attachments for the load. Including file objects with
  `id` and `fileName` will register any new files before associating them with
  the load.
- **Path Parameters**:
  - `loadId` – identifier returned from the create response.
- **Request Body**: Any subset of the _Load Payload_ shape. All fields are optional.
- **Successful Response**: `200 OK`

```json
{
  "message": "Load updated successfully"
}
```

### Change Load Status

- **Method**: `PATCH /loads/{loadId}/status`
- **Description**: Update only the workflow status for a load. This endpoint is
  the preferred way to move a load between operational states without touching
  any other fields. Valid statuses are limited to `Pending`, `Approved`, and
  `Denied`.
- **Request Body**:

```json
{
  "status": "Approved"
}
```

- **Successful Response**: `200 OK`

```json
{
  "message": "Load status updated successfully",
  "loadId": "ab4d2a07-0f92-4f97-96c0-9e0fdac50301",
  "status": "Approved",
  "statusChangedBy": "ops.manager@example.com"
}
```

If the authenticated user cannot be matched to a record in the `users` table,
the response includes `"statusChangedBy": null`.

### Delete Load

- **Method**: `DELETE /loads/{loadId}`
- **Description**: Remove the load and its associated entries from the
  `load_files` join table. The referenced files remain in the Files service so
  they can be re-used elsewhere.
- **Path Parameters**:
  - `loadId` – identifier of the load to delete.
- **Successful Response**: `200 OK`

```json
{
  "message": "Load deleted successfully"
}
```

## Notes for Front-End Integration

- Always include the JWT bearer token required by the API Gateway authorizer.
- To attach supporting documents, first upload them with the Files API and
  supply the returned `fileId` values in the `files` array.
- Branch validation happens server-side; the API looks up the authenticated
  user's branch and fails the request if none is assigned.
- Numeric fields (`customerRate`, `carrierRate`) accept decimal numbers. Omit
  them or send `null` to clear stored values.
- After mutating a load, refresh any cached load lists to reflect the latest
  status, status change actor, and attachments.
