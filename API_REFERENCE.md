# Chat & Event APIs - Quick Reference

## Base URL
```
https://s9t1485z29.execute-api.ap-south-1.amazonaws.com/dev
```

## Authentication
All endpoints require:
- **Header:** `Authorization: Bearer <JWT_TOKEN>`
- **JWT Source:** AWS Cognito User Pool
- **Claims Used:** `sub` (user ID), `email`, `name`

---

## 🗨️ Chat APIs

### 1. Send Chat Message
**Endpoint:** `POST /api/chat/send-message`

**Request:**
```json
{
  "chapterId": "string (required)",
  "recipientId": "string (required)",
  "message": "string (required, 1-5000 chars)",
  "messageType": "string (optional, default: 'text')"
}
```

**Response (200):**
```json
{
  "success": true,
  "messageId": "uuid",
  "threadId": "chapter-id#user-a#user-b",
  "createdAt": "2026-03-30T01:58:38Z"
}
```

**Error Responses:**
- `400`: Missing fields, invalid message length
- `401`: No authentication token
- `404`: Chapter not found
- `500`: Server error

---

### 2. Get Chat Messages
**Endpoint:** `GET /api/chat/messages`

**Query Parameters:**
```
chapterId    - string (required)
otherUserId  - string (required)
limit        - number (optional, default: 50, max: 100)
startKey     - string (optional, for pagination)
```

**Response (200):**
```json
{
  "success": true,
  "threadId": "chapter-1#user-a#user-b",
  "thread": {
    "threadId": "...",
    "chapterId": "...",
    "participantA": "...",
    "participantB": "...",
    "messageCount": 12,
    "lastMessageAt": "2026-03-30T01:58:38Z"
  },
  "messages": [
    {
      "threadId": "chapter-1#user-a#user-b",
      "messageId": "uuid",
      "senderId": "user-a",
      "senderEmail": "user@example.com",
      "senderName": "User Name",
      "recipientId": "user-b",
      "chapterId": "chapter-1",
      "messageType": "text",
      "message": "Hello!",
      "isRead": true,
      "createdAt": "2026-03-30T01:58:38Z"
    }
  ],
  "messageCount": 10,
  "totalCount": 125,
  "hasMore": true,
  "nextStartKey": "eyJ0aHJlYWRJZCI6ICJjaGFwdGVyLTEjdXNlci1hI3VzZXItYiIsICJtZXNzYWdlSWQiOiAidXVpZC1oZXJlIn0="
}
```

**Notes:**
- Messages automatically marked as read when retrieved
- Pagination: Use `nextStartKey` for subsequent requests
- Messages sorted oldest to newest

---

### 3. List Chat Conversations
**Endpoint:** `GET /api/chat/conversations`

**Query Parameters:**
```
chapterId  - string (required)
limit      - number (optional, default: 20)
```

**Response (200):**
```json
{
  "success": true,
  "userId": "user-123",
  "chapterId": "chapter-123",
  "conversations": [
    {
      "threadId": "chapter-1#user-a#user-b",
      "chapterId": "chapter-1",
      "otherParticipantId": "user-456",
      "lastMessage": "Thanks for your help!",
      "lastMessageAt": "2026-03-30T01:58:38Z",
      "messageCount": 15,
      "lastMessageSenderId": "user-456"
    }
  ],
  "totalCount": 8
}
```

**Notes:**
- Sorted by most recent message first
- Only includes active conversations
- Returns conversation preview (first 100 chars)

---

## 📅 Event Registration APIs

### 4. Join Free Event
**Endpoint:** `POST /api/events/join`

**Request:**
```json
{
  "eventId": "string (required)",
  "chapterId": "string (optional, recommended)",
  "studentName": "string (optional)",
  "studentEmail": "string (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully joined event",
  "registration": {
    "eventId": "...",
    "userId": "...",
    "studentName": "...",
    "studentEmail": "...",
    "chapterId": "...",
    "title": "Event Name",
    "paymentStatus": "NA",
    "joinedAt": "2026-03-30T01:58:38Z"
  }
}
```

**Error Responses:**
- `400`: Already registered, event is full, event is paid
- `404`: Event not found
- `400` (with currentAttendees/maxAttendees): Event capacity reached

**Important Changes:**
- ✅ Now validates event capacity before allowing registration
- ✅ Attendee count reliably incremented with retry logic
- ✅ Concurrent requests properly handled

---

### 5. Verify Event Payment
**Endpoint:** `POST /api/events/verify`

**Request:**
```json
{
  "razorpayOrderId": "string (required)",
  "razorpayPaymentId": "string (required)",
  "razorpaySignature": "string (required)",
  "eventId": "string (required)",
  "userId": "string (required)",
  "transactionId": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment verified and registration completed",
  "transactionId": "..."
}
```

**Error Responses:**
- `400`: Invalid signature, missing fields, event full
- `404`: Event not found, pending registration not found
- `400` (with currentAttendees/maxAttendees): Capacity reached after payment

**Important Changes:**
- ✅ Validates event capacity before finalizing registration
- ✅ Reverts registration if capacity exceeded during verification
- ✅ Attendee count updated with retry logic
- ✅ Atomic updates prevent overselling

---

## 📊 Response Status Codes

| Code  | Meaning |
|-------|---------|
| 200   | Success |
| 400   | Bad Request (validation error) |
| 401   | Unauthorized (no token) |
| 404   | Not Found (chapter/event/user) |
| 500   | Server Error (see CloudWatch) |

---

## 🔄 Pagination Example

```javascript
// First request
const response1 = await fetch(
  '/api/chat/messages?chapterId=ch1&otherUserId=user2&limit=50'
);
const data1 = await response1.json();

// If hasMore is true, get next page
if (data1.hasMore) {
  const response2 = await fetch(
    `/api/chat/messages?chapterId=ch1&otherUserId=user2&limit=50&startKey=${data1.nextStartKey}`
  );
  const data2 = await response2.json();
}
```

---

## 🧪 Manual Testing

### Send Message (cURL)
```bash
curl -X POST https://s9t1485z29.execute-api.ap-south-1.amazonaws.com/dev/api/chat/send-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "chapter-1",
    "recipientId": "user-456",
    "message": "Hello!",
    "messageType": "text"
  }'
```

### Get Messages (cURL)
```bash
curl -X GET "https://s9t1485z29.execute-api.ap-south-1.amazonaws.com/dev/api/chat/messages?chapterId=chapter-1&otherUserId=user-456&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### List Conversations (cURL)
```bash
curl -X GET "https://s9t1485z29.execute-api.ap-south-1.amazonaws.com/dev/api/chat/conversations?chapterId=chapter-1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` | Verify JWT token is valid and includes in Authorization header |
| `400 Invalid message` | Ensure message is 1-5000 characters |
| `404 Chapter not found` | Verify chapterId exists |
| `Messages not updating` | Check isRead flag, ensure otherUserId is correct |
| `Attendee count wrong` | Check CloudWatch logs for failed updates |

---

## 📈 Rate Limiting

- No explicit rate limit configured
- Default AWS Lambda throttling: 1000 concurrent executions
- DynamoDB: On-demand billing (auto-scales)

---

## 🔒 CORS Headers

All endpoints include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

---

**Last Updated:** March 30, 2026
**API Version:** 1.0
**Status:** ✅ Production Ready
