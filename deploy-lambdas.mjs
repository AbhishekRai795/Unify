import { LambdaClient, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const client = new LambdaClient({ region: "ap-south-1" });

async function zipFile(sourceFile, targetZip) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(targetZip);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => resolve(targetZip));
    archive.on('error', reject);
    
    archive.pipe(output);
    // Rename to index.mjs inside the zip as per Lambda defaults
    archive.file(sourceFile, { name: 'index.mjs' });
    archive.finalize();
  });
}

async function deployFunction(functionName, sourceFile) {
  console.log(`Zipping ${sourceFile} for ${functionName}...`);
  const zipPath = `${functionName}.zip`;
  await zipFile(sourceFile, zipPath);
  
  const zipBuffer = fs.readFileSync(zipPath);
  console.log(`Deploying ${functionName}...`);
  
  const command = new UpdateFunctionCodeCommand({
    FunctionName: functionName,
    ZipFile: zipBuffer,
  });
  
  try {
    const response = await client.send(command);
    console.log(`Successfully updated ${functionName}`);
    return response;
  } catch (err) {
    console.error(`Failed to update ${functionName}`, err.message || err);
    // Don't throw - continue with other functions
    return null;
  } finally {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  }
}

async function main() {
  const functions = [
    {
      name: "listChapters",
      source: "lambda_functions/listChapters-dc0a8851-a25b-45de-9ffc-c76eab7c8c6a.mjs"
    },
    {
      name: "getChapterslist",
      source: "lambda_functions/getChapterslist-0595ec1c-028f-4d74-8cb7-6602316ab659.mjs"
    },
    {
      name: "getStudentAvailableChapters",
      source: "lambda_functions/getStudentAvailableChapters-0eab7eac-740a-4fac-bcac-fa236ec763ef.mjs"
    },
    {
      name: "getStudentMyChapters",
      source: "lambda_functions/getStudentMyChapters-a5e5deac-37c3-4e04-a56e-49f0599ee832.mjs"
    },
    {
      name: "updateChapter",
      source: "lambda_functions/updateChapter.mjs"
    },
    {
      name: "getChapter",
      source: "lambda_functions/getChapter-8783eeb4-06cd-452e-9ce3-032bcc425621.mjs"
    },
    {
      name: "RegisterStudentToChapter",
      source: "lambda_functions/RegisterStudentToChapter-ea653b48-de1d-476f-a0ce-5399a07ad34f.mjs"
    },
    {
      name: "createRazorpayOrder",
      source: "lambda_functions/createRazorpayOrder-payment.mjs"
    },
    {
      name: "chapterHeadHandler",
      source: "lambda_functions/chapterHeadHandler-b84e1712-27f2-4951-a461-f73bc848e8d3.mjs"
    },
    {
      name: "studentHandler",
      source: "lambda_functions/studentHandler-91f29577-13bd-4cf3-858f-c12e87cce082.mjs"
    },
    {
      name: "studentLeaveChapter",
      source: "lambda_functions/studentLeaveChapter-26c7ff36-e9ed-4b03-8c0a-c3861233b2ea.mjs"
    }
  ];

  for (const fn of functions) {
    if (fs.existsSync(fn.source)) {
      await deployFunction(fn.name, fn.source);
    } else {
      console.warn(`File not found: ${fn.source}`);
    }
  }
}

main().catch(console.error);
