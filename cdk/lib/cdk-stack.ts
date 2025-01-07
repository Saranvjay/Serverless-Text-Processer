import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'; // Import s3 notifications

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define an S3 bucket
    const bucket = new s3.Bucket(this, 'UploadsBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For testing purposes; avoid in production
    });

    // Define a DynamoDB table
    const table = new dynamodb.Table(this, 'ProcessedFilesTable', {
      partitionKey: { name: 'file_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For testing purposes; avoid in production
    });

    // Define a Lambda function
    const lambdaFunction = new lambda.Function(this, 'ProcessFileFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'handler.main',
      code: lambda.Code.fromAsset('../lambda'), // Path to your Lambda function code
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
    });

    // Grant necessary permissions to the Lambda function
    bucket.grantRead(lambdaFunction);
    table.grantWriteData(lambdaFunction);

    // Add an event notification for the S3 bucket
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(lambdaFunction) // This is where 's3n' is used correctly
    );

    // Define an API Gateway REST API
    const api = new apigateway.RestApi(this, 'FileProcessorApi', {
      restApiName: 'File Processor Service',
    });

    // Create an integration for the Lambda function
    const uploadIntegration = new apigateway.LambdaIntegration(lambdaFunction);
    api.root.addResource('upload').addMethod('POST', uploadIntegration);
  }
}

