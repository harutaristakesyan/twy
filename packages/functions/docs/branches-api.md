# Branches API Guide

This document explains how the front end can interact with the Branches service. All
routes require an authenticated request (JWT authorizer) and return JSON payloads.
Unless otherwise noted, requests and responses use the `application/json`
content type.

Base URL for the functions stack:

```
https://<api-domain>/api
```

All Branch endpoints live under the `/branches` prefix shown below.

## Common Data Shapes

### Branch

```json
{
  "id": "<uuid>",
  "name": "<branch name>",
  "contact": "<contact details or null>",
  "owner": {
    "id": "<user id>",
    "email": "owner@example.com",
    "firstName": "Jane",
    "lastName": "Doe"
  }
}
```

- `contact` can be `null` when no details are stored.
- `owner` is `null` when the branch is not assigned to a user. The owner details are
  resolved by joining against the `users` table; the Branch record itself does not
  store an `ownerId` column.

### Error Format

Errors follow the standard Lambda error responses produced by Middy. Common
status codes include `400` for validation issues, `404` for missing records, and
`500` for unexpected errors.

## Endpoints

### List Branches

- **Method**: `GET /branches`
- **Description**: Retrieve all branches with pagination, sorting, and search capabilities. Each branch includes its owner information, if assigned.
- **Query Parameters**:
  - `page` (optional, default: `0`) – zero-indexed page number for pagination.
  - `limit` (optional, default: `5`) – number of branches per page.
  - `sortField` (optional, default: `createdAt`) – field to sort by. Allowed values: `name`, `contact`, `createdAt`.
  - `sortOrder` (optional, default: `descend`) – sort direction. Allowed values: `ascend`, `descend`.
  - `query` (optional) – search string to filter by branch name or contact information.
- **Request Body**: none.
- **Successful Response**: `200 OK`

```json
{
  "branches": [
    {
      "id": "08be347c-b67d-44b5-a7fb-c40e9b5695ac",
      "name": "Main Store",
      "contact": "1-555-1234",
      "owner": {
        "id": "6cc3fe05-6c6f-448e-a27b-3e5341f08347",
        "email": "manager@example.com",
        "firstName": "Morgan",
        "lastName": "Lee"
      }
    },
    {
      "id": "b3e436f6-5356-4a7e-81d1-9709cfaf1f0a",
      "name": "West Side",
      "contact": null,
      "owner": null
    }
  ],
  "total": 2
}
```

**Example Requests**:

- `GET /branches?page=0&limit=10` – Fetch first 10 branches (default sort by creation date, descending).
- `GET /branches?sortField=name&sortOrder=ascend` – Fetch branches sorted alphabetically by name.
- `GET /branches?query=downtown` – Search for branches matching "downtown" in name or contact.

### Create Branch

- **Method**: `POST /branches`
- **Description**: Create a new branch and assign it to an existing user.
- **Request Body**:

```json
{
  "name": "Downtown",
  "owner": "6cc3fe05-6c6f-448e-a27b-3e5341f08347",
  "contact": "1-555-2222"
}
```

- `name` – required, non-empty string.
- `owner` – required user ID. The API verifies the user exists and updates their
  `branch` reference in the `users` table.
- `contact` – optional string. Omit to leave the field empty.

- **Successful Response**: `201 Created`

```json
{
  "message": "Branch created successfully"
}
```

- **Failure Modes**:
  - `400 Bad Request` when validation fails (e.g., missing name or owner).
  - `404 Not Found` when the referenced owner does not exist.

### Update Branch

- **Method**: `PUT /branches/{branchId}`
- **Description**: Update the specified branch. You can change the name, contact
  information, or owner.
  - **Path Parameters**:
  - `branchId` – UUID of the branch to update.
    - **Request Body**: Provide at least one of the following fields.

```json
{
  "name": "Downtown East",
  "contact": null,
  "owner": "c69d6d9f-84f4-498e-96ad-57ae40c65c84"
}
```

- `name` – optional string. When present, replaces the branch name.
- `contact` – optional string or `null`. Pass `null` to clear existing contact details.
- `owner` – optional user ID or `null`. Pass a user ID to assign a new owner or
  `null` to unassign the branch from any user. The API clears previous owner
  assignments in the `users.branch` column before setting the new owner.

- **Successful Response**: `200 OK`

```json
{
  "message": "Branch updated successfully"
}
```

- **Failure Modes**:
  - `400 Bad Request` when no fields are provided or validation fails.
  - `404 Not Found` when the branch or specified owner does not exist.

### Delete Branch

- **Method**: `DELETE /branches/{branchId}`
- **Description**: Remove the branch and clear any user assignments.
- **Path Parameters**:
  - `branchId` – UUID of the branch to delete.
    - **Request Body**: none.
    - **Successful Response**: `204 No Content`
    - **Failure Modes**:
  - `404 Not Found` when the branch does not exist.

## Notes for Front-End Integration

- Always include the authentication token expected by the API Gateway authorizer
  (e.g., `Authorization: Bearer <JWT>` header).
  - The API automatically manages owner relationships through the `users.branch`
    column. To fetch potential owners, query the Users API and pass the selected
    user's `id` in the Branch requests.
  - After updating or deleting a branch, refresh any cached branch lists to ensure
    the UI reflects the latest owner assignments.
