// secrets-manager-setup.js
// Run this once to store Razorpay credentials in AWS Secrets Manager
import { SecretsManagerClient, CreateSecretCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "ap-south-1" });

export const setupRazorpayCredentials = async () => {
  try {
    const secretValue = {
      key_id: "rzp_test_SWAh58F3yse7lJ",
      key_secret: "llIrsgJJLG8NaIQsUPUPCYs1"
    };

    const response = await client.send(new CreateSecretCommand({
      Name: "unify/razorpay/credentials",
      Description: "Razorpay API credentials for payment processing",
      SecretString: JSON.stringify(secretValue),
      Tags: [
        { Key: "Application", Value: "Unify" },
        { Key: "Service", Value: "Payments" }
      ]
    }));

    console.log("   Razorpay credentials stored successfully");
    console.log("Secret ARN:", response.ARN);
    console.log("Secret Name: unify/razorpay/credentials");
    
    return response;
  } catch (error) {
    if (error.name === "ResourceExistsException") {
      console.log("⚠️  Secret already exists. You can update it using AWS Secrets Manager console.");
    } else {
      console.error("  Error storing credentials:", error);
      throw error;
    }
  }
};

// Run this to setup
// setupRazorpayCredentials();

export default setupRazorpayCredentials;
