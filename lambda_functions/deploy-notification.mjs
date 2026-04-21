import { LambdaClient, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const client = new LambdaClient({ region: "ap-south-1" });

async function zipDirectory(sourceDir, targetZip) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(targetZip);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => resolve(targetZip));
    archive.on('error', reject);
    
    archive.pipe(output);
    // Add all files in the directory
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function deployFunction() {
  const functionName = "unify-mark-notification-read-dev";
  const sourceDir = "Google meet integration /unify-mark-notification-read-dev-351896ed-c8cd-499b-b9ee-ab40ead1d804";
  
  console.log(`Zipping directory ${sourceDir} for ${functionName}...`);
  const zipPath = `${functionName}.zip`;
  
  try {
    await zipDirectory(sourceDir, zipPath);
    const zipBuffer = fs.readFileSync(zipPath);
    
    console.log(`Deploying to AWS Lambda: ${functionName}...`);
    const command = new UpdateFunctionCodeCommand({
      FunctionName: functionName,
      ZipFile: zipBuffer,
    });
    
    const response = await client.send(command);
    console.log(`Successfully updated ${functionName}!`);
    console.log(`Revision ID: ${response.RevisionId}`);
  } catch (err) {
    console.error(`Failed to deploy ${functionName}:`, err.message || err);
    process.exit(1);
  } finally {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  }
}

deployFunction().catch(console.error);
