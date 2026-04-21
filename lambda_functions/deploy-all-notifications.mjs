import { LambdaClient, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const lambdaClient = new LambdaClient({ region: "ap-south-1" });

const lambdas = [
  {
    name: "unify-mark-notification-read-dev",
    dir: "Google meet integration /unify-mark-notification-read-dev-351896ed-c8cd-499b-b9ee-ab40ead1d804"
  },
  {
    name: "unify-list-notifications-dev",
    dir: "Google meet integration /unify-list-notifications-dev-8887964f-b24d-4414-825f-e0d2e28102ed"
  },
  {
    name: "unify-create-chapter-meeting-dev",
    dir: "Google meet integration /unify-create-chapter-meeting-dev-ea54311b-caa7-4b75-9511-d8ad11dc0495"
  }
];

async function zipDirectory(sourceDir, outPath) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', err => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

async function deploy() {
  for (const lambda of lambdas) {
    const zipPath = path.join(process.cwd(), `${lambda.name}.zip`);
    const sourceDir = path.join(process.cwd(), lambda.dir);

    console.log(`\n--- Deploying ${lambda.name} ---`);
    console.log(`Zipping ${sourceDir}...`);
    
    try {
      await zipDirectory(sourceDir, zipPath);
      const zipBuffer = fs.readFileSync(zipPath);

      console.log(`Updating ${lambda.name} on AWS...`);
      const command = new UpdateFunctionCodeCommand({
        FunctionName: lambda.name,
        ZipFile: zipBuffer,
      });

      const response = await lambdaClient.send(command);
      console.log(`✅ Success! Revision: ${response.RevisionId}`);
      
      // Cleanup
      fs.unlinkSync(zipPath);
    } catch (error) {
      console.error(`❌ Failed to deploy ${lambda.name}:`, error.message);
    }
  }
}

deploy();
