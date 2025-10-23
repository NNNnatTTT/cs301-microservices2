// import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
// const sqs = new SQSClient({ region: process.env.AWS_REGION || "ap-southeast-1" });

// export async function publish(event, payload) {
//   const url = process.env.SQS_QUEUE_URL;
//   if (!url) return; // no-op if not configured
//   const cmd = new SendMessageCommand({
//     QueueUrl: url,
//     MessageBody: JSON.stringify({ event, payload, ts: new Date().toISOString() }),
//   });
//   await sqs.send(cmd);
// }
