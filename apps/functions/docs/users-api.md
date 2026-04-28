# Users API Guide

This guide describes the authenticated endpoints that expose user data and
management features. All routes require JWT authorization and exchange JSON
payloads using the `application/json` content type.

Base URL for the functions stack:

```
https://<api-domain>/api
```

## Common Data Shapes

### User Branch

```json
{
  "id": "<uuid>",
  "name": "<branch name or null>"
}
```

### User

```json
{
  "id": "<uuid>",
  "email": "user@example.com",
  "firstName": "Riley",
  "lastName": "Cooper",
  "role": "Admin",
  "isActive": true,
  "branch": {
    "id": "c3d2a6c0-1a6c-4fc2-a5c7-15e9a90e9612",
    "name": "Central"
  },
  "registeredDate": "2024-02-15T18:21:37.000Z"
}
```

- `branch` is `null` when the user is not assigned to a branch.
- `registeredDate` reflects the `users.createdAt` timestamp. A `null` value means
  the timestamp is not available in the database.

### Error Format

Errors follow the standard structure returned by the Middy error handler. Common
status codes include `400` for validation issues, `404` for missing users, and
`500` for unexpected errors.

## Endpoints

### Get Signed-In User

- **Method**: `GET /user`
- **Description**: Return profile data for the authenticated caller, including
  branch metadata and registration date.
- **Request Body**: none.
- **Successful Response**: `200 OK`

```json
{
  "email": "user@example.com",
  "firstName": "Riley",
  "lastName": "Cooper",
  "role": "Admin",
  "isActive": true,
  "branch": {
    "id": "c3d2a6c0-1a6c-4fc2-a5c7-15e9a90e9612",
    "name": "Central"
  },
  "registeredDate": "2024-02-15T18:21:37.000Z"
}
```

### Update Signed-In User

- **Method**: `PATCH /user`
- **Description**: Allow the authenticated user to update their own name
  information.
- **Request Body**: Provide at least one of the following properties.

```json
{
  "firstName": "Jordan",
  "lastName": "Lopez"
}
```

- **Successful Response**: `200 OK`

```json
{
  "message": "User updated successfully"
}
```

### List Users

- **Method**: `GET /users`
- **Description**: Retrieve users with pagination, optional search, and sorting.
- **Query Parameters**:
  - `page` (optional, default: `0`) – zero-indexed page number.
  - `limit` (optional, default: `5`) – number of users per page.
  - `sortField` (optional, default: `createdAt`) – allowed values: `firstName`,
    `lastName`, `email`, `role`, `isActive`, `createdAt`, `branch`.
  - `sortOrder` (optional, default: `descend`) – allowed values: `ascend`,
    `descend`.
  - `query` (optional) – search text applied to first name, last name, and
    email.
- **Request Body**: none.
- **Successful Response**: `200 OK`

```json
{
  "users": [
    {
      "id": "1913fadc-6d92-4c4c-8ad9-c7a45421a0b7",
      "email": "manager@example.com",
      "firstName": "Morgan",
      "lastName": "Lee",
      "role": "Owner",
      "isActive": true,
      "branch": {
        "id": "c3d2a6c0-1a6c-4fc2-a5c7-15e9a90e9612",
        "name": "Central"
      },
      "registeredDate": "2024-02-15T18:21:37.000Z"
    }
  ],
  "total": 1
}
```

### Admin Update User

- **Method**: `PATCH /users/{userId}`
- **Description**: Allow administrators to update another user's branch
  assignment, role, or active status.
- **Path Parameters**:
  - `userId` – UUID of the user to update.
- **Request Body**: Provide at least one of the following properties.

```json
{
  "branch": "c3d2a6c0-1a6c-4fc2-a5c7-15e9a90e9612",
  "role": "Staff",
  "isActive": false
}
```

- **Successful Response**: `200 OK`

```json
{
  "message": "User updated successfully"
}
```

### Admin Delete User

- **Method**: `DELETE /users/{userId}`
- **Description**: Permanently remove a user.
- **Path Parameters**:
  - `userId` – UUID of the user to delete.
- **Request Body**: none.
- **Successful Response**: `200 OK`

```json
{
  "message": "User deleted successfully"
}
```

## Notes for Front-End Integration

- Always include the `Authorization: Bearer <JWT>` header expected by the API
  Gateway authorizer.
- The admin update endpoint validates branch IDs before assignment. Pass `null`
  for the `branch` property to clear an assignment.
- After administrative updates or deletions, refresh any cached user lists so
  the UI reflects the latest state.
