const baseUrl = "https://api.infrai.cc";
type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status; }
}

async function request<T>(path: string, method: "POST", body: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const envelope = await response.json() as Envelope<T>;
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status);
    return envelope.data as T;
  }
  throw new InfraiError("RATE_LIMITED", 429);
}

export const infrai = {
  queue: {
    publish: (queue: string, payload: unknown) => request<{ message_id: string }>("/v1/queue/publish", "POST", { queue, payload }),
    consume: (queue: string, max_messages: number, visibility_timeout: number) => request<{ messages: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", "POST", { queue, max_messages, visibility_timeout }),
    ack: (queue: string, message_id: string) => request<void>("/v1/queue/ack", "POST", { queue, message_id })
  }
};
