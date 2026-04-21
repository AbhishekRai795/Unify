import boto3
import urllib.parse

transcribe = boto3.client('transcribe')

def lambda_handler(event, context):
    # Get the bucket and file key from the S3 event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])

    # Check file extension
    if not (key.endswith('.mp3') or key.endswith('.mp4')):
        print(f"Unsupported file type: {key}")
        return {"status": "skipped", "reason": "Unsupported media type"}

    # Generate a unique job name (simple strategy)
    job_name = key.replace('/', '_').replace('.', '_') + '_transcription'

    media_uri = f's3://{bucket}/{key}'

    try:
        response = transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': media_uri},
            MediaFormat='mp3' if key.endswith('.mp3') else 'mp4',
            LanguageCode='en-US',  # Update as needed
            OutputBucketName='my-transcribe-output-bucket-0011'
        )
        print(f"Started transcription job: {job_name}")
        return {"status": "started", "job_name": job_name}
    except Exception as e:
        print(f"Error starting transcription: {str(e)}")
        return {"status": "error", "message": str(e)}
