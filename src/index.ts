import crypto from "node:crypto";

const redirect = (url: string) => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  });
};

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload, "utf8");
  const calculated = Buffer.from(`sha256=${hmac.digest("hex")}`);
  const provided = Buffer.from(signature);
  return crypto.timingSafeEqual(calculated, provided);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method !== "POST") {
      return redirect(env.REPOSITORY_URL);
    }
    return handlePostRequest(request, env);
  },
} satisfies ExportedHandler<Env>;

async function handlePostRequest(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("X-Hub-Signature-256");
  const secret = env.WEBHOOK_SECRET;

  if (!signature || !secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.text();

  if (!verifySignature(payload, signature, secret)) {
    return new Response("Forbidden", { status: 403 });
  }
  const jsonPayload = JSON.parse(payload);
  const githubEvent = request.headers.get("x-github-event");
  if (githubEvent === "ping") {
    return new Response("Ping received", { status: 200 });
  } else if (githubEvent !== "push") {
    return new Response(`Event ${githubEvent} not handled`, { status: 200 });
  }
  console.log(`Received push event with ID ${request.headers.get("x-github-delivery")}`);
  return processGithubWebhook(jsonPayload, env);
}

async function processGithubWebhook(payload: any, env: Env): Promise<Response> {
  const eventType = payload.action;
  console.log(`Processing event of type: ${eventType}`, payload);

  return new Response(`Processed event of type: ${eventType}`, { status: 200 });
}
