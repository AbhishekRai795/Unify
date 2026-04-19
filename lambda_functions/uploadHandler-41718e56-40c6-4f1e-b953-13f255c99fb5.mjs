const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { fileName, fileContent, mimeType } = body;

    if (!fileName || !fileContent || !mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing file data' })
      };
    }

    const key = `${Date.now()}-${fileName.replace(/\s+/g, '-')}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(fileContent, 'base64'),
      ContentType: mimeType,
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString()
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        file: {
          key,
          bucket: process.env.AWS_BUCKET_NAME
        }
      })
    };
  } catch (err) {
    console.error('Upload error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Upload failed', details: err.message })
    };
  }
};
