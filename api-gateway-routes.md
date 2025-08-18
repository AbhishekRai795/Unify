# AWS API Gateway Routes Configuration for Unify HeadPortal

## Base URL
```
https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev
```

## Chapter Head Routes (chapterHeadHandler.js)

### 1. Get Chapter Head Profile
- **Endpoint**: `POST /chapterhead-profile` ✅ (Already exists)
- **Method**: POST
- **Auth**: Bearer Token Required
- **Description**: Get chapter head profile information

### 2. Get Managed Chapters
- **Endpoint**: `GET /chapterhead/my-chapters` ⚡ (New)
- **Method**: GET
- **Auth**: Bearer Token Required
- **Description**: Get chapters managed by the current chapter head
- **Lambda**: chapterHeadHandler.js

### 3. Get Dashboard Statistics
- **Endpoint**: `GET /chapterhead/dashboard` ⚡ (New)
- **Method**: GET
- **Auth**: Bearer Token Required
- **Description**: Get dashboard statistics (member count, pending registrations, etc.)
- **Lambda**: chapterHeadHandler.js

### 4. Get Registration Requests
- **Endpoint**: `GET /chapterhead/registrations` ⚡ (New)
- **Method**: GET
- **Auth**: Bearer Token Required
- **Query Parameters**: 
  - `limit` (optional): Number of results to return
- **Description**: Get all registration requests for managed chapters
- **Lambda**: chapterHeadHandler.js

### 5. Get Chapter-Specific Registrations
- **Endpoint**: `GET /chapterhead/registrations/{chapterId}` ⚡ (New)
- **Method**: GET
- **Auth**: Bearer Token Required
- **Path Parameters**:
  - `chapterId`: Chapter ID
- **Description**: Get registration requests for a specific chapter
- **Lambda**: chapterHeadHandler.js

### 6. Toggle Chapter Registration Status
- **Endpoint**: `PUT /chapterhead/toggle-registration` ⚡ (New)
- **Method**: PUT
- **Auth**: Bearer Token Required
- **Body**:
```json
{
  "chapterId": "string",
  "status": "open" | "closed"
}
```
- **Description**: Open or close chapter registration
- **Lambda**: chapterHeadHandler.js

### 7. Update Registration Status (Approve/Reject)
- **Endpoint**: `PUT /chapterhead/registration/{registrationId}` ⚡ (New)
- **Method**: PUT
- **Auth**: Bearer Token Required
- **Path Parameters**:
  - `registrationId`: Registration request ID
- **Body**:
```json
{
  "status": "approved" | "rejected",
  "notes": "string (optional)"
}
```
- **Description**: Approve or reject a student registration request
- **Lambda**: chapterHeadHandler.js

### 8. Get Recent Activities
- **Endpoint**: `GET /chapterhead/activities` ⚡ (New)
- **Method**: GET
- **Auth**: Bearer Token Required
- **Query Parameters**:
  - `limit` (optional): Number of activities to return (default: 10)
- **Description**: Get recent activities for managed chapters
- **Lambda**: chapterHeadHandler.js

## Student Routes (studentHandler.js)

### 1. Register for Chapter
- **Endpoint**: `POST /register-student` ✅ (Already exists, needs update)
- **Method**: POST
- **Auth**: Bearer Token Required
- **Body**:
```json
{
  "chapterName": "string",
  "studentName": "string",
  "studentEmail": "string"
}
```
- **Description**: Register student for a chapter
- **Lambda**: studentHandler.js

### 2. Get Available Chapters
- **Endpoint**: `GET /get-chapters` ✅ (Already exists, needs update)
- **Method**: GET
- **Auth**: Bearer Token Required
- **Description**: Get all available chapters for registration
- **Lambda**: studentHandler.js

### 3. Get Student's Registered Chapters
- **Endpoint**: `GET /student/my-chapters` ⚡ (New)
- **Method**: GET
- **Auth**: Bearer Token Required
- **Description**: Get chapters the student is registered for
- **Lambda**: studentHandler.js

### 4. Get Student Dashboard
- **Endpoint**: `GET /student/dashboard` ✅ (Already exists, needs update)
- **Method**: GET
- **Auth**: Bearer Token Required
- **Description**: Get student dashboard data
- **Lambda**: studentHandler.js

### 5. Leave Chapter
- **Endpoint**: `DELETE /student/chapters/{chapterId}/leave` ⚡ (New)
- **Method**: DELETE
- **Auth**: Bearer Token Required
- **Path Parameters**:
  - `chapterId`: Chapter ID to leave
- **Description**: Allow student to leave a chapter
- **Lambda**: studentHandler.js

## Database Schema Updates Required

### 1. Chapter Table Updates
Add the following fields to the `Chapter` table:
```
registrationOpen (Boolean) - Whether registration is open for this chapter
```

### 2. New Registration Requests Table (Recommended)
Create a new table `RegistrationRequests` for better tracking:
```
registrationId (String) - Primary Key
userId (String) - User requesting registration
chapterId (String) - Chapter being requested
status (String) - pending/approved/rejected
appliedAt (String) - ISO timestamp
processedAt (String) - ISO timestamp (optional)
processedBy (String) - Chapter head email (optional)
notes (String) - Optional notes from chapter head
```

### 3. Activities Table (Recommended)
Create an `Activities` table for tracking recent activities:
```
activityId (String) - Primary Key
chapterId (String) - Related chapter
type (String) - registration/event/chapter_update
message (String) - Activity description
timestamp (String) - ISO timestamp
userId (String) - Related user (optional)
metadata (Object) - Additional data (optional)
```

## API Gateway Configuration Steps

### For New Routes, create these resources:

1. `/chapterhead` resource
2. `/chapterhead/my-chapters` - GET method
3. `/chapterhead/dashboard` - GET method  
4. `/chapterhead/registrations` - GET method
5. `/chapterhead/registrations/{chapterId}` - GET method
6. `/chapterhead/toggle-registration` - PUT method
7. `/chapterhead/registration/{registrationId}` - PUT method
8. `/chapterhead/activities` - GET method

9. `/student` resource (if not exists)
10. `/student/my-chapters` - GET method
11. `/student/chapters/{chapterId}/leave` - DELETE method

### Integration Settings:
- **Integration Type**: Lambda Function
- **Lambda Function**: 
  - Chapter Head routes → `chapterHeadHandler`
  - Student routes → `studentHandler`
- **Use Lambda Proxy Integration**: ✅ Enabled

### CORS Settings:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
```

### Authorization:
- **Type**: AWS_IAM or Cognito User Pool Authorizer
- **Authorization**: AWS_IAM (if using Cognito JWT tokens)

## Deployment Commands

After setting up the routes:

1. **Deploy API Gateway**:
   ```bash
   aws apigateway create-deployment \
     --rest-api-id your-api-id \
     --stage-name dev
   ```

2. **Test Endpoints**:
   ```bash
   # Test chapter head profile
   curl -X POST https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev/chapterhead-profile \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   
   # Test get chapters
   curl -X GET https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev/chapterhead/my-chapters \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Implementation Priority

### Phase 1 (High Priority):
1. ✅ `/chapterhead/my-chapters` - GET
2. ✅ `/chapterhead/dashboard` - GET  
3. ✅ `/chapterhead/toggle-registration` - PUT
4. ✅ Update existing `/register-student` and `/get-chapters`

### Phase 2 (Medium Priority):
1. ✅ `/chapterhead/registrations` - GET
2. ✅ `/chapterhead/registration/{registrationId}` - PUT
3. ✅ `/student/my-chapters` - GET

### Phase 3 (Low Priority):
1. ✅ `/chapterhead/activities` - GET
2. ✅ `/student/chapters/{chapterId}/leave` - DELETE
3. Registration Requests table implementation
4. Activities tracking system

This configuration will make your HeadPortal fully functional with the AWS backend!
