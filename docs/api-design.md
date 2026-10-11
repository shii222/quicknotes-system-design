
# QuickNotes REST API Design

## 1. Overview

QuickNotes is an online note-taking service where users can create, view, update, and delete their personal notes.

The API follows REST principles and uses JSON for exchanging data between the frontend and backend.

Base URL:

https://api.quicknotes.example/v1

This is a proposed API address, not a live service.

All endpoints except registration and login require authentication using a Bearer token.

## 2. REST API Endpoints

| Method | Endpoint | Description | Success Status |
|---|---|---|---|
| POST | /auth/register | Register a new user | 201 Created |
| POST | /auth/login | Authenticate a user | 200 OK |
| GET | /notes | List the authenticated user's notes | 200 OK |
| GET | /notes/{id} | Retrieve a specific note | 200 OK |
| POST | /notes | Create a new note | 201 Created |
| PATCH | /notes/{id} | Update a note | 200 OK |
| DELETE | /notes/{id} | Delete a note | 204 No Content |
| GET | /tags | List the user's tags | 200 OK |
| POST | /tags | Create a new tag | 201 Created |

## 3. Create Note: POST /notes

### Request

Headers:

Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

Request body:

```json
{
  "title": "Learn REST APIs",
  "body": "Practice GET, POST, PATCH and DELETE."
}
```

### Successful Response

HTTP Status: 201 Created

```json
{
  "id": 101,
  "user_id": 1,
  "title": "Learn REST APIs",
  "body": "Practice GET, POST, PATCH and DELETE.",
  "created_at": "2026-10-11T08:00:00Z",
  "updated_at": "2026-10-11T08:00:00Z"
}
```

The title is required and must contain no more than 100 characters. The body is optional.

## 4. List Notes: GET /notes

Example request:

GET /notes?limit=10&offset=0

### Successful Response

HTTP Status: 200 OK

```json
{
  "data": [
    {
      "id": 101,
      "user_id": 1,
      "title": "Learn REST APIs",
      "body": "Practice GET and POST.",
      "created_at": "2026-10-11T08:00:00Z",
      "updated_at": "2026-10-11T08:00:00Z"
    },
    {
      "id": 102,
      "user_id": 1,
      "title": "Study SQL",
      "body": "Learn primary and foreign keys.",
      "created_at": "2026-10-11T09:00:00Z",
      "updated_at": "2026-10-11T09:00:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 2
  }
}
```

An empty notes list returns HTTP 200 with an empty data array.

## 5. Error Status Codes

| Status | Meaning | Example |
|---|---|---|
| 400 Bad Request | Invalid input or missing title | Empty title |
| 401 Unauthorized | Missing or invalid authentication | Expired token |
| 403 Forbidden | User lacks permission | Access denied |
| 404 Not Found | Requested resource does not exist | Unknown note ID |
| 409 Conflict | Resource conflicts with existing data | Duplicate email registration |
| 429 Too Many Requests | Rate limit exceeded | Too many requests |
| 500 Internal Server Error | Unexpected server failure | Database connection failure |

### Example Error Response

HTTP Status: 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The note title is required.",
    "details": {
      "title": "Must contain 1 to 100 characters."
    }
  }
}
```

## 6. Authentication and Security

- Passwords must be securely hashed, never stored as plain text.
- HTTPS protects data in transit.
- Protected endpoints require valid access tokens.
- Users can access only their own notes and tags.
- Server-side validation is required even when the frontend validates inputs.
- Rate limiting reduces API abuse.
- Database queries must use parameters to prevent SQL injection.

## 7. API Design Decisions

- REST endpoints use nouns such as /notes rather than verbs.
- GET retrieves data without modifying it.
- POST creates resources.
- PATCH updates existing resources.
- DELETE removes resources.
- HTTP status codes clearly describe request outcomes.
- Pagination prevents very large responses.
- JSON provides a consistent format for requests and responses.
- API versioning using /v1 allows future changes without immediately breaking existing clients.

## 8. Conclusion

This design defines a secure, RESTful QuickNotes API that supports user authentication, note management, tags, validation, error handling and pagination.

It provides a foundation for implementing the backend service.

