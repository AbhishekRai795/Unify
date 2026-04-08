#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-secrets.sh
# One-time script to store Razorpay credentials in AWS Secrets Manager
# Run once BEFORE deploying the SAM stack
# ─────────────────────────────────────────────────────────────────────────────

set -e

REGION="ap-south-1"
SECRET_NAME="unify/razorpay/credentials"
KEY_ID="rzp_test_SWAh58F3yse7lJ"
KEY_SECRET="llIrsgJJLG8NaIQsUPUPCYs1"

echo "🔐 Setting up Razorpay credentials in AWS Secrets Manager..."
echo "   Region : $REGION"
echo "   Secret : $SECRET_NAME"
echo ""

# Check if secret already exists
EXISTING=$(aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" 2>&1 || true)

if echo "$EXISTING" | grep -q "ARN"; then
  echo "⚠️  Secret '$SECRET_NAME' already exists. Updating value..."
  
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "{\"key_id\":\"$KEY_ID\",\"key_secret\":\"$KEY_SECRET\"}" \
    --region "$REGION"
  
  echo "   Secret updated successfully!"
else
  echo "📝 Creating new secret '$SECRET_NAME'..."
  
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "Razorpay API credentials for Unify payment processing" \
    --secret-string "{\"key_id\":\"$KEY_ID\",\"key_secret\":\"$KEY_SECRET\"}" \
    --region "$REGION" \
    --tags \
      '[{"Key":"Application","Value":"Unify"},{"Key":"Component","Value":"Payment"}]'
  
  echo "   Secret created successfully!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Secret Name : $SECRET_NAME"
echo "   Region      : $REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Razorpay credentials are ready in AWS Secrets Manager."
echo "   You can now run: sam build && sam deploy"
