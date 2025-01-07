import boto3
import os
import json

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

DEFAULT_BUCKET_NAME = "cdkstack-uploadsbucket5e5e9b64-knmh6taahtbl"  # Replace this with your default bucket name

def main(event, context):
    try:
        # Log the entire event for debugging
        print("Event received:", json.dumps(event, indent=2))

        # Parse event to get bucket name and object key
        bucket_name = event.get('Records', [{}])[0].get('s3', {}).get('bucket', {}).get('name', DEFAULT_BUCKET_NAME)
        object_key = event.get('Records', [{}])[0].get('s3', {}).get('object', {}).get('key')
        
        print(f"Bucket Name: {bucket_name}")
        print(f"Object Key: {object_key}")

        if not object_key:
            raise ValueError("Object key not found in the event.")
        
        # Read file content
        response = s3.get_object(Bucket=bucket_name, Key=object_key)
        content = response['Body'].read().decode('utf-8')
        
        # Log file content length
        print(f"Content Length: {len(content)}")
        
        # Count lines
        line_count = len(content.splitlines())
        print(f"Line Count: {line_count}")
        
        # Prepare DynamoDB entry
        table = dynamodb.Table(os.environ['TABLE_NAME'])
        table.put_item(
            Item={
                'file_id': object_key,
                'timestamp': response['LastModified'].isoformat(),
                'line_count': line_count,
            }
        )
        
        print("File processed and data inserted into DynamoDB successfully.")
        return {'statusCode': 200, 'body': json.dumps('File processed successfully.')}
    
    except s3.exceptions.NoSuchKey as e:
        print(f"NoSuchKey Error: The specified key does not exist - {str(e)}")
        return {'statusCode': 404, 'body': json.dumps("Error: The specified key does not exist.")}

    except KeyError as e:
        print(f"KeyError: Missing key in the event - {e}")
        return {'statusCode': 400, 'body': json.dumps(f"Error: Missing key - {e}")}
    
    except Exception as e:
        print(f"Unhandled exception: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps(f"Error processing file: {str(e)}")}
