import json
import boto3
import urllib.parse
from datetime import datetime

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('transcripts')
    
    try:
        # Get S3 file details
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
        
        # Only process TXT files
        if not key.endswith('.txt'):
            return {'statusCode': 200, 'body': 'Not a TXT file'}
        
        print(f"Processing: {key}")
        
        # FIXED: Extract job ID to match frontend expectations
        # Your TXT file: "1754938117364-Range_mp3_transcription.txt"
        # Frontend expects: "transcribe-1754938117364-Range"
        
        filename = key.split('/')[-1].replace('.txt', '')  # "1754938117364-Range_mp3_transcription"
        
        # Extract the timestamp and original name parts
        if '_mp3_transcription' in filename:
            base_name = filename.replace('_mp3_transcription', '')  # "1754938117364-Range"
        elif '_transcription' in filename:
            base_name = filename.replace('_transcription', '')
        else:
            base_name = filename
            
        job_id = f"transcribe-{base_name}"  # "transcribe-1754938117364-Range"
        
        print(f"Creating job ID: {job_id}")
        
        # Store S3 file location in DynamoDB with the CORRECT job ID
        table.put_item(
            Item={
                'jobId': job_id,  # This now matches what frontend expects
                'txtFileKey': key,
                'txtFileBucket': bucket,
                'txtFileUrl': f"s3://{bucket}/{key}",
                'status': 'completed',
                'completedAt': datetime.utcnow().isoformat(),
                'fileName': base_name.split('-', 1)[-1] if '-' in base_name else base_name  # Extract "Range"
            }
        )
        
        print(f"Successfully stored in DynamoDB with job ID: {job_id}")
        return {'statusCode': 200, 'body': 'Success'}
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {'statusCode': 500, 'body': str(e)}
