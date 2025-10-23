# Session Management Service

![alt text](image.png)

> [!warning]
> Please refer to the Swagger documentation for the latest API details.

## Purpose of this service:
- Manage session activity status
- Retrieve session details using various parameters
- Provide session identifiers for integration with other services

## Endpoints:

### Update Active Session Status
```http
POST /update_active
Content-Type: application/json

{
    "modsecyear": "AY2024-25",
    "title": "Lecture 1",
    "active": true
}

Response (200):
{
    "message": "Update successful",
    "data": {...}
}
```

### Get Active Session Status
```http
GET /get_active?session_id=<session_id>

Response (200):
{
    "message": "Query successful",
    "data": [
        {
            "active": true
        }
    ]
}
```
```http
GET /get_active?modsecyear=<modsecyear>&title=<title>

Response (200):
{
    "message": "Query successful",
    "data": [
        {
            "active": true
        }
    ]
}
```

### Get Session ID
```http
GET /get_session_id?modsecyear=<modsecyear>&title=<title>

Response (200):
{
    "session_id": "12345"
}
```

### Get Module Section Year
```http
GET /get_modsecyear?session_id=<session_id>

Response (200):
{
    "modsecyear": "AY2024-25"
}
```

## Authentication:
- No authentication required for the current implementation
- Future versions may include authentication mechanisms

## Error Responses:
- 400: Bad Request (missing or invalid fields)
- 404: Not Found (record does not exist)
- 500: Server Error

## Configuration:
Environment variables required:
- `SUPABASE_URL`: Supabase instance URL
- `SUPABASE_KEY`: API key for Supabase authentication

## Dependencies:
- Flask
- Supabase Python SDK

## Notes:
- Sessions are stored in the `session` table
- Active status updates allow tracking of ongoing sessions
- Queries support fetching session details by session ID, module, or academic year

