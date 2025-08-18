# 🚨 URGENT: API Gateway Routes Missing

## Problem Summary
Your frontend is trying to call new API endpoints that don't exist in AWS API Gateway yet:
- `/chapterhead/my-chapters`
- `/chapterhead/dashboard` 
- `/chapterhead/registrations`
- `/chapterhead/activities`
- `/student/my-chapters`
- `/student/dashboard`

## Immediate Solution

### Step 1: Deploy Missing Routes
Run the deployment script:
```bash
cd /home/abhishek-rai/College\ Projects/Unify/frontend
./deploy-api-routes.sh
```

### Step 2: Fix Profile Endpoint Issue
The existing `/chapterhead-profile` endpoint expects a `chapterName` parameter. You have two options:

**Option A: Quick Fix (Recommended)**
Update your Lambda function to not require `chapterName` for the profile endpoint.

**Option B: Provide Default Chapter**
Modify the frontend to provide a default chapter name.

## Manual API Gateway Setup (Alternative)

If the script doesn't work, manually create these resources in AWS Console:

### In API Gateway Console:
1. Go to your API: `y0fr6gasgk`
2. Create these resources:

```
/chapterhead (if not exists)
├── /my-chapters (GET → chapterHeadHandler)
├── /dashboard (GET → chapterHeadHandler)  
├── /registrations (GET → chapterHeadHandler)
│   └── /{chapterId} (GET → chapterHeadHandler)
├── /toggle-registration (PUT → chapterHeadHandler)
├── /registration (PUT → chapterHeadHandler)
│   └── /{registrationId} (PUT → chapterHeadHandler)
└── /activities (GET → chapterHeadHandler)

/student (if not exists)
├── /my-chapters (GET → studentHandler)
├── /dashboard (GET → studentHandler)
└── /chapters
    └── /{chapterId}
        └── /leave (DELETE → studentHandler)
```

### For each method:
1. Set **Authorization**: AWS_IAM
2. Set **Integration Type**: Lambda Function
3. Enable **Lambda Proxy Integration**
4. Point to correct Lambda function
5. Deploy to `dev` stage

## Database Updates Needed

You also need to create these tables in DynamoDB:

### 1. Update Chapter Table
Add field: `registrationOpen` (Boolean)

### 2. Create RegistrationRequests Table
```
Table Name: RegistrationRequests
Partition Key: registrationId (String)
Attributes:
- userId (String)
- chapterId (String) 
- status (String) - pending/approved/rejected
- appliedAt (String) - ISO timestamp
- processedAt (String) - Optional
- processedBy (String) - Optional 
- notes (String) - Optional
```

### 3. Create Activities Table
```
Table Name: Activities
Partition Key: activityId (String)
Attributes:
- chapterId (String)
- type (String) - registration/event/chapter_update
- message (String)
- timestamp (String) - ISO timestamp
- userId (String) - Optional
- metadata (Object) - Optional
```

## Priority Order
1. ✅ **Deploy API Gateway routes** (deploy-api-routes.sh)
2. ✅ **Create DynamoDB tables** 
3. ✅ **Update Lambda functions** if needed
4. ✅ **Test endpoints**

## Test Commands
After deployment:
```bash
# Test chapter head endpoints
curl -X GET https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev/chapterhead/my-chapters \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test student endpoints  
curl -X GET https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev/student/my-chapters \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Action Plan

### Immediate Steps (Priority Order):

#### 1. Check Current AWS Resources
```bash
./check-aws-resources.sh
```

#### 2. Deploy Lambda Functions (if missing)
If the Lambda functions don't exist:
- Upload `chapterHeadHandler.js` to AWS Lambda
- Upload `studentHandler.js` to AWS Lambda (or update existing)

#### 3. Deploy API Gateway Routes
```bash
./deploy-api-routes.sh
```

#### 4. Create DynamoDB Tables
Create these tables in AWS Console:

**RegistrationRequests Table:**
- Table name: `RegistrationRequests`
- Partition key: `registrationId` (String)
- No sort key needed

**Activities Table:**
- Table name: `Activities`  
- Partition key: `activityId` (String)
- No sort key needed

**Update Chapter Table:**
- Add attribute: `registrationOpen` (Boolean, default: false)

#### 5. Test the Application
After completing steps 1-4:
- Login as chapter head → Should see dashboard with data
- Login as student → Should see available chapters
- Test registration flow

## 🐛 Common Issues & Solutions

**Issue: 400 "Missing email or chapterName"**
- Solution: Your Lambda function needs the user's chapter association
- Quick fix: Update Lambda to extract chapter from JWT token

**Issue: 500 Internal Server Error**
- Solution: API Gateway routes don't exist → Run deploy script
- Or Lambda functions are missing → Upload them first

**Issue: CORS errors**
- Solution: API Gateway CORS not configured → Deploy script handles this

Once you deploy the routes, your frontend should work properly!

## 📞 Need Help?
If deployment fails, check:
1. AWS CLI is configured with correct permissions
2. Lambda functions exist and are named correctly
3. API Gateway ID is correct (y0fr6gasgk)
4. Region is ap-south-1
