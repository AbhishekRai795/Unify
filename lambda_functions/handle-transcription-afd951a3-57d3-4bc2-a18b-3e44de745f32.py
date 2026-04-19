import boto3
import json

def lambda_handler(event, context):
    message = json.loads(event['Records'][0]['Sns']['Message'])
    
    job_name = message['TranscriptionJobName']
    transcribe = boto3.client('transcribe')
    
    result = transcribe.get_transcription_job(TranscriptionJobName=job_name)
    transcript_uri = result['TranscriptionJob']['Transcript']['TranscriptFileUri']
    
    print(f"Transcription complete for {job_name}")
    print(f"Transcript URI: {transcript_uri}")
    
    return {"status": "done", "uri": transcript_uri}
