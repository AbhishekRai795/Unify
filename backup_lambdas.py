import boto3
import requests
import os
import shutil
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

def download_lambdas(backup_dir="backup_lambda_functions"):
    """
    Downloads all Lambda functions from the configured AWS region into a backup directory.
    """
    # Create the backup directory if it doesn't exist
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
        print(f"Created directory: {backup_dir}")

    try:
        # Initialize the Lambda client
        # This will use the default session credentials (AWS CLI config or env vars)
        lambda_client = boto3.client('lambda')
        
        # Use a paginator to handle accounts with many functions (default limit is 50)
        paginator = lambda_client.get_paginator('list_functions')
        
        count = 0
        print("Starting backup process...")

        for page in paginator.paginate():
            for function in page['Functions']:
                function_name = function['FunctionName']
                file_path = os.path.join(backup_dir, f"{function_name}.zip")
                
                # Skip if already downloaded
                if os.path.exists(file_path):
                    print(f"Skipping {function_name} (already exists)")
                    count += 1
                    continue

                print(f"Processing function: {function_name}")

                try:
                    # Get function details which includes the 'Code.Location' presigned S3 URL
                    response = lambda_client.get_function(FunctionName=function_name)
                    code_url = response['Code']['Location']
                    
                    # Download the ZIP file using requests with a timeout
                    r = requests.get(code_url, stream=True, timeout=30)
                    if r.status_code == 200:
                        with open(file_path, 'wb') as f:
                            r.raw.decode_content = True
                            shutil.copyfileobj(r.raw, f)
                        print(f"  [SUCCESS] Downloaded to {file_path}")
                        count += 1
                    else:
                        print(f"  [ERROR] Failed to download {function_name}. Status code: {r.status_code}")

                except Exception as e:
                    print(f"  [ERROR] Could not backup {function_name}: {str(e)}")

        print(f"\nBackup complete. Total functions downloaded: {count}")
        print(f"All backups are stored in: {os.path.abspath(backup_dir)}")

    except (NoCredentialsError, PartialCredentialsError):
        print("\n[CRITICAL ERROR] AWS credentials not found or incomplete.")
        print("Please configure your AWS credentials using 'aws configure' or set environment variables:")
        print("export AWS_ACCESS_KEY_ID='your_access_key'")
        print("export AWS_SECRET_ACCESS_KEY='your_secret_key'")
        print("export AWS_REGION='your_region'")
    except Exception as e:
        print(f"\n[CRITICAL ERROR] An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    download_lambdas()
