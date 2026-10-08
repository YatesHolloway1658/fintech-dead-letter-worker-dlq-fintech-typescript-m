import { z } from "zod";
import { infrai } from "./infrai.js";

export const paymentEvent = z.object({ event_id: z.string().min(1), account_id: z.string().min(1), amount_cents: z.number().int().positive(), currency: z.string().length(3), attempt: z.number().int().nonnegative(), failure_reason: z.string().min(1) });
export type PaymentEvent = z.infer<typeof paymentEvent>;
export type Action = "retry" | "review" | "dead-letter";
const sourceQueue = "payment-failures";
const auditQueue = "payment-failure-audits";

export function chooseAction(event: PaymentEvent): Action {
  if (event.amount_cents >= 100000 || event.attempt >= 3) return "review";
  return "dead-letter";
}

export async function handlePayment(eventInput: unknown) {
  const event = paymentEvent.parse(eventInput);
  const action = chooseAction(event);
  const audit = { ...event, action, audited_at: new Date().toISOString() };
  if (action === "dead-letter") await infrai.queue.publish(auditQueue, audit);
  return { event_id: event.event_id, action, audit };
}

export async function drainOnce() {
  const batch = await infrai.queue.consume(sourceQueue, 10, 30);
  const results = [];
  for (const message of batch.messages ?? []) {
    const result = await handlePayment(message.payload);
    await infrai.queue.ack(sourceQueue, message.message_id);
    results.push(result);
  }
  return results;
}
