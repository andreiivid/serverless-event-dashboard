import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';

export class InfraStack extends cdk.Stack {
  public readonly eventsTable: Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.eventsTable = new Table(this, 'EventsTable', {
      tableName: 'serverless-event-dashboard-events',
      partitionKey: {
        name: 'eventId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ingestEventFunction = new NodejsFunction(this, 'IngestEventFunction', {
      functionName: 'serverless-event-dashboard-ingest-event',
      entry: path.join(__dirname, '../backend/functions/ingest-event/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      environment: {
        EVENTS_TABLE_NAME: this.eventsTable.tableName,
      },
    });

    this.eventsTable.grantWriteData(ingestEventFunction);
    const api = new RestApi(this, 'EventsApi', {
    restApiName: 'serverless-event-dashboard-api',
    description: 'API for ingesting and querying application events.',
  });

  const events = api.root.addResource('events');
  events.addMethod('POST', new LambdaIntegration(ingestEventFunction));
  }
}