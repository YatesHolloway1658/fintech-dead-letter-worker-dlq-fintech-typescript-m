import assert from "node:assert/strict";
import { chooseAction, paymentEvent } from "./dead_letter.js";

const event = paymentEvent.parse({ event_id: "pay_101", account_id: "acct_9", amount_cents: 2500, currency: "USD", attempt: 1, failure_reason: "issuer_declined" });
assert.equal(chooseAction(event), "dead-letter");
assert.equal(chooseAction({ ...event, amount_cents: 150000 }), "review");
assert.throws(() => paymentEvent.parse({ ...event, currency: "US" }));
console.log("payment decision test passed");
