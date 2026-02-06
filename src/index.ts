import crypto from "node:crypto";
import type { GitHubPushEvent } from "./types";
import { getWebhookConfig } from "./config";
import type { RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/v10";
import { inspect } from "node:util";
import { buildTagActionMessage, buildBranchActionMessage, buildCommitPushMessage } from "./messages";

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
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "POST") {
      if (!env.REDIRECT_URL) {
        console.warn(
          "Received non-POST request but no REDIRECT_URL is configured. redirecting to default GitHub repository."
        );
      }
      return redirect(env.REDIRECT_URL || "https://github.com/The-LukeZ/github-webhook/");
    }
    return handlePostRequest(request, env, path);
  },
} satisfies ExportedHandler<Env>;

async function handlePostRequest(request: Request, env: Env, path: string): Promise<Response> {
  const signature = request.headers.get("X-Hub-Signature-256");
  const secret = env.WEBHOOK_SECRET;

  if (!signature || !secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.text();

  if (!verifySignature(payload, signature, secret)) {
    return new Response("Forbidden", { status: 403 });
  }

  const discordWebhookUrl = getWebhookConfig(path, env);
  if (!discordWebhookUrl) {
    console.error(`No webhook configuration found for path: ${path}`);
    return new Response("Webhook not configured for this path", { status: 404 });
  }

  const jsonPayload = JSON.parse(payload);
  const githubEvent = request.headers.get("x-github-event");
  if (githubEvent === "ping") {
    return new Response("Ping received", { status: 200 });
  } else if (githubEvent !== "push") {
    return new Response(`Event ${githubEvent} not handled`, { status: 200 });
  }
  console.log(`Processing GitHub event ${githubEvent} for path ${path}`);
  console.log(`Received push event with ID ${request.headers.get("x-github-delivery")} for path ${path}`);
  return processGithubWebhook(jsonPayload, discordWebhookUrl);
}

type ContextDetails = {
  name: string;
} & (
  | {
      type: "branch";
      action: "created" | "deleted" | "updated";
    }
  | {
      type: "tag";
      action: "created" | "deleted";
    }
);

const nullField = "0000000000000000000000000000000000000000";

function getContext(payload: GitHubPushEvent): ContextDetails | null {
  const ref = payload.ref;
  let action: ContextDetails["action"];
  if (payload.before === nullField && payload.after !== nullField) {
    action = "created";
  } else if (payload.after === nullField && payload.before !== nullField) {
    action = "deleted";
  } else {
    action = "updated";
  }
  if (ref.startsWith("refs/heads/")) {
    // it's a branch
    return {
      type: "branch",
      name: ref.replace("refs/heads/", ""),
      action: action,
    };
  } else if (ref.startsWith("refs/tags/")) {
    // it's a tag
    return {
      type: "tag",
      name: ref.replace("refs/tags/", ""),
      action: action as "created" | "deleted", // tags can't be updated
    };
  }
  return null;
}

async function processGithubWebhook(p: GitHubPushEvent, discordWebhookUrl: string): Promise<Response> {
  const context = getContext(p);
  if (!context) {
    // Should not happen
    console.error("Could not determine context from ref:", p.ref);
    return new Response("Could not determine context from ref", { status: 400 });
  }

  let payload: RESTPostAPIWebhookWithTokenJSONBody;
  if (context.type === "tag") {
    payload = buildTagActionMessage(
      context.action,
      p.repository.owner.name || p.repository.owner.login,
      p.repository.owner.html_url,
      p.repository.name,
      p.repository.html_url,
      p.sender.name || p.sender.login,
      p.sender.html_url,
      context.name,
      `${p.repository.html_url}/releases/tag/${context.name}`
    );
  } else if (context.type === "branch" && context.action !== "updated") {
    payload = buildBranchActionMessage(
      context.action,
      p.repository.owner.name || p.repository.owner.login,
      p.repository.owner.html_url,
      p.repository.name,
      p.repository.html_url,
      p.sender.name || p.sender.login,
      p.sender.html_url,
      context.name,
      `${p.repository.html_url}/tree/${context.name}`
    );
  } else {
    payload = buildCommitPushMessage(
      p.repository.owner.name || p.repository.owner.login,
      p.repository.owner.html_url,
      p.repository.name,
      p.repository.html_url,
      p.compare,
      p.sender.name || p.sender.login,
      p.sender.html_url,
      p.commits,
      context.name
    );
  }

  try {
    await fetch(discordWebhookUrl + "?with_components=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("Error sending message to Discord:", { error: inspect(error) });
    return new Response("Error sending message to Discord", { status: 500 });
  }

  return new Response("Webhook processed", { status: 200 });
}
