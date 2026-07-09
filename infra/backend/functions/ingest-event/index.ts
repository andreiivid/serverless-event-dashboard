import { randomUUID } from 'crypto';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const tableName = process.env.EVENTS_TABLE_NAME;

export const handler = async (event: { body?: string | null }) => {
  if (!tableName) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Missing EVENTS_TABLE_NAME environment variable' }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Request body is required' }),
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const eventId = randomUUID();
    const createdAt = new Date().toISOString();

    await dynamodb.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          eventId: { S: eventId },
          eventType: { S: String(payload.eventType ?? 'unknown') },
          source: { S: String(payload.source ?? 'unknown') },
          detail: { S: JSON.stringify(payload.detail ?? {}) },
          createdAt: { S: createdAt },
        },
      }),
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Event ingested',
        eventId,
        createdAt,
      }),
    };
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON request body' }),
    };
  }
};