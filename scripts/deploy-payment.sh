#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-payment.sh
# Full deployment script for the Unify Payment Stack
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║         Unify Payment Stack — Deploy                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

REGION="ap-south-1"
STACK_NAME="unify-payment-stack"

# ── Step 1: Verify AWS credentials ────────────────────────────────────────────
echo "Step 1/5 — Checking AWS credentials..."
aws sts get-caller-identity --region "$REGION" > /dev/null 2>&1 || {
  echo "❌ AWS credentials not configured. Run: aws configure"
  exit 1
}
echo "✅ AWS credentials OK"
echo ""

# ── Step 2: (Skipped) Secrets Manager handled by SAM ──────────────────────────
echo "Step 2/5 — Skipping manual secret setup, SAM manages it..."
echo ""

# ── Step 3: SAM Build ──────────────────────────────────────────────────────────
echo "Step 3/5 — Building Lambda functions..."
sam build --use-container 2>/dev/null || sam build
echo "✅ SAM build complete"
echo ""

# ── Step 4: SAM Deploy ────────────────────────────────────────────────────────
echo "Step 4/5 — Deploying to AWS ($REGION)..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --resolve-s3 \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "Environment=dev" \
    "FrontendOrigin=*" \
    "CognitoUserPoolId=ap-south-1_ueutDQExM" \
    "CognitoUserPoolAppClientId=6uac5t9b0oub9b1cjoot94uplc" \
    "RazorpayKeyId=rzp_test_SWAh58F3yse7lJ" \
    "RazorpayKeySecret=llIrsgJJLG8NaIQsUPUPCYs1"

echo ""
echo "✅ Deployment complete!"
echo ""

# ── Step 5: Get the new API URL ────────────────────────────────────────────────
echo "Step 5/5 — Fetching Payment API URL..."
PAYMENT_API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='PaymentApiUrl'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -n "$PAYMENT_API_URL" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                    🎉 DEPLOYMENT DONE                       ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  Payment API URL:                                           ║"
  echo "║  $PAYMENT_API_URL"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  Add this to your .env file:                                ║"
  echo "║  VITE_PAYMENT_API_BASE_URL=$PAYMENT_API_URL"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  
  # Auto-update .env file
  if [ -f ".env" ]; then
    if grep -q "VITE_PAYMENT_API_BASE_URL" .env; then
      # Update existing line
      sed -i.bak "s|VITE_PAYMENT_API_BASE_URL=.*|VITE_PAYMENT_API_BASE_URL=$PAYMENT_API_URL|" .env
      rm -f .env.bak
    else
      # Add new line
      echo "" >> .env
      echo "# Payment API (new stack — separate from existing Unify backend)" >> .env
      echo "VITE_PAYMENT_API_BASE_URL=$PAYMENT_API_URL" >> .env
    fi
    echo "✅ .env file updated with VITE_PAYMENT_API_BASE_URL"
    echo ""
    echo "👉 Now run: npm run dev — to test locally"
  fi
else
  echo "⚠️  Could not fetch API URL automatically. Check CloudFormation outputs."
fi
