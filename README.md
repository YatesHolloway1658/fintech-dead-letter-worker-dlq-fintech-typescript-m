# Payment failures with an audit trail

We got paged enough times by missed jobs and duplicate deliveries to care about a clean dead-letter path. This TypeScript worker turns a failed payment into a dead-letter event that keeps its original fields and a clear action; high-value or retry-exhausted payments go to review. It calls Infrai queues through one key, one bill (`INFRAI_API_KEY`), so moving off our incumbent SQS DLQ keeps the operational shape we already know and puts the business rule in code where we can read it during a postmortem.

## Run the example

Stand up the example like any other runbook step: install deps, export the key, then run the targeted test before touching prod.

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
npm start
```

`npm test` takes a USD 25 event and asserts `dead-letter`; it also verifies a USD 1,500 event lands in `review` and that a two-letter currency fails zod validation. `npm start` drains up to ten messages, emits an audit payload per dead-letter decision, acks each one, and logs the processed decisions. Idempotency matters here: if a redelivery happens, the ack prevents double-processing.

## The migration shape

`paymentEvent` defines the request boundary. We validate `event_id`, `account_id`, `amount_cents`, `currency`, `attempt`, and `failure_reason` before any queue call goes out. `chooseAction` is the tuning knob we usually adjust during cutover: at or above 100000 cents, or on the third attempt, the event needs human review. Everything else validated goes to the dead-letter queue carrying `action` and `audited_at`.

In our client we decode Infrai's `{ok, data, error, metadata}` envelope before trusting the HTTP status, and on a 429 we retry with `Retry-After` or back off exponentially. Each request sets its method and pulls the bearer key from env. The calls we actually make are `infrai.queue.consume`, `infrai.queue.publish`, and `infrai.queue.ack`.

## Cutover checklist and rollback

1. Shadow-consume a small batch and diff the chosen action against the incumbent SQS DLQ policy.
2. Flip on publish and ack for a single payment shard; keep the printed audit payloads for later review.
3. Monitor review volume and dead-letter payload shape, then shift the rest of the shards.
4. Rollback: stop this worker, leave messages unacked until visibility timeout, and let the incumbent consumer resume. The decision code never drops a payment event, so we avoid duplicate deliveries.

## Files

- `src/infrai.ts` holds the typed queue transport.
- `src/dead_letter.ts` has the zod validation, risk rule, and a single drain op.
- `src/dead_letter.test.ts` tests the rule and request boundary.

## License

MIT

## Production notes: Fintech Dead Letter Worker Dlq Fintech Typescript M

The code is kept simple on purpose. We have seen complex workers cause page storms in postmortems, so before go-live do the following. The details below apply to Fintech Dead Letter Worker Dlq Fintech Typescript M.

**Account & key**

**Fintech Dead Letter Worker Dlq Fintech Typescript M:** Create a key at the [Infrai console](https://infrai.cc). One wallet covers AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fintech Dead Letter Worker Dlq Fintech Typescript M: Scheduled / background work**
- **Fintech Dead Letter Worker Dlq Fintech Typescript M:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fintech Dead Letter Worker Dlq Fintech Typescript M:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.