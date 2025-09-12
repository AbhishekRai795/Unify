# Cognito 400 Error Fix - Custom Attributes Setup

## The Problem
Getting `400 Bad Request` during signup because Cognito doesn't recognize `custom:sapId` and `custom:year` attributes.

## Solution: Create Custom Attributes in Cognito User Pool

### Step 1: Add Custom Attributes
1. Go to **AWS Cognito Console**
2. Navigate to **User Pools** → `ap-south-1_ueutDQExM`
3. Click **Sign-up experience** in the left sidebar
4. Scroll down to **Custom attributes** section
5. Click **Add custom attribute**

**Add these two attributes:**

**Attribute 1:**
- Name: `sapId`
- Type: `String`
- Min length: `1`
- Max length: `50`
- Mutable: `Yes` ✅

**Attribute 2:**
- Name: `year` 
- Type: `String`
- Min length: `1`
- Max length: `10`
- Mutable: `Yes` ✅

6. Click **Save changes**

### Step 2: Verify App Client Settings
1. Go to **App integration** → **App clients**
2. Click on your app client (`6uac5t9b0oub9b1cjoot94uplc`)
3. Under **Authentication flows**, ensure these are enabled:
   - ✅ `ALLOW_USER_SRP_AUTH`
   - ✅ `ALLOW_REFRESH_TOKEN_AUTH`
4. Under **Attribute read and write permissions**:
   - Ensure `custom:sapId` and `custom:year` are **readable** and **writable**

### Step 3: Test Signup
After creating the custom attributes, try the signup flow again. The 400 error should be resolved.

## Verification Commands

Check if custom attributes were created:
```bash
aws cognito-idp describe-user-pool --user-pool-id ap-south-1_ueutDQExM --query 'UserPool.SchemaAttributes[?Name==`custom:sapId` || Name==`custom:year`]'
```

Test signup and check user was created:
```bash
aws cognito-idp admin-get-user --user-pool-id ap-south-1_ueutDQExM --username "test@example.com"
```

## Your Current Lambda Triggers ✅
Your existing Lambda functions are correctly configured:
- **Post-Confirmation**: Saves user to DynamoDB and adds to "student" group
- **Pre-Authentication**: Logs user groups for audit

## Expected JWT Token After Fix
```json
{
  "email": "student@example.com",
  "name": "Student Name", 
  "custom:sapId": "12345",
  "custom:year": "2023",
  "cognito:groups": ["student"]
}
```

The issue is simply that Cognito doesn't know about your custom attributes yet!
