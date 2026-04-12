import boto3
import json
import logging

s3 = boto3.client('s3')
logging.basicConfig(level=logging.INFO)

def lambda_handler(event, context):
    try:
        # Get file info from S3 event
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        
        logging.info(f"Received file: {key} in bucket: {bucket}")
        
        # Read transcript JSON
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')
        transcript_json = json.loads(content)
        
        # Extract transcript text
        transcript_text = transcript_json['results']['transcripts'][0]['transcript']
        
        # Save plain text to output bucket
        output_bucket = 'my-transcribe-output-bucket-0011'  # Change to your processed bucket
        output_key = key.replace('.json', '.txt')

        s3.put_object(
            Bucket=output_bucket,
            Key=output_key,
            Body=transcript_text,
            ContentType='text/plain'
        )

        logging.info(f"Transcript saved as {output_key} in {output_bucket}")
        
        # (Optional) Generate presigned URL for frontend fetch
        presigned_url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': output_bucket,
                'Key': output_key
            },
            ExpiresIn=3600  # 1 hour
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'transcript_url': presigned_url,
                'file': output_key
            })
        }

    except Exception as e:
        logging.error(f"Error processing transcript: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
