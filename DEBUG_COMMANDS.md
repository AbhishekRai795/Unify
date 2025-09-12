# Quick Cognito Troubleshooting Commands

## Check Password Policy
```bash
aws cognito-idp describe-user-pool --user-pool-id ap-south-1_ueutDQExM --query 'UserPool.Policies.PasswordPolicy'
```

## Check if user already exists
```bash
aws cognito-idp admin-get-user --user-pool-id ap-south-1_ueutDQExM --username "youremail@domain.com"
```

## Check app client detailed settings
```bash
aws cognito-idp describe-user-pool-client --user-pool-id ap-south-1_ueutDQExM --client-id 6uac5t9b0oub9b1cjoot94uplc --query 'UserPoolClient.{ExplicitAuthFlows:ExplicitAuthFlows,ReadAttributes:ReadAttributes,WriteAttributes:WriteAttributes}'
```

## Test basic signup without custom attributes
Try signing up with just email and name first to isolate the issue.

## Most Common 400 Causes:
1. **Password too weak** - Try: `TempPassword123!@#`
2. **User already exists** - Try different email
3. **Invalid email format** - Ensure proper email
4. **Empty/invalid attribute values** - Check sapId and year aren't empty
