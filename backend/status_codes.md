# HTTP Status Codes for API Responses

## 1️⃣ Success statuses

| Status Code | Meaning | Use Case |
|------------|---------|---------|
| 200 OK | Request succeeded | Default for GET, POST (if not creating new resource), PUT, PATCH |
| 201 Created | Resource successfully created | For POST requests that create a new entity, like your Admin signup |
| 204 No Content | Request succeeded but no response body | For DELETE requests or actions that don’t return data |

---

## 2️⃣ Client error statuses (4xx)

| Status Code | Meaning | Use Case |
|------------|---------|---------|
| 400 Bad Request | Invalid input from client | Missing required fields, invalid JSON, failed validation |
| 401 Unauthorized | Authentication required or failed | Login required or invalid token |
| 403 Forbidden | Authenticated but not allowed | Trying to access admin route without admin role |
| 404 Not Found | Resource doesn’t exist | Looking up a user that doesn’t exist |
| 409 Conflict | Resource conflict | Trying to create a duplicate user/email |

---

## 3️⃣ Server error statuses (5xx)

| Status Code | Meaning | Use Case |
|------------|---------|---------|
| 500 Internal Server Error | Unexpected server error | Catch-all for unhandled exceptions |
| 502 Bad Gateway / 503 Service Unavailable / 504 Gateway Timeout | API is down or upstream service failed | Rare in simple Express app, more for microservices |