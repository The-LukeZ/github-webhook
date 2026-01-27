import crypto from "node:crypto";
import type { GitHubPushEvent } from "./types";
import {
  APIActionRowComponent,
  APIComponentInMessageActionRow,
  APIContainerComponent,
  APITextDisplayComponent,
  ComponentType,
  MessageFlags,
  RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import { inspect } from "node:util";

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

const inlineCode = (text: string) => `\`${text}\`` as const;

async function processGithubWebhook(p: GitHubPushEvent, env: Env): Promise<Response> {
  const branch = p.ref.replace("refs/heads/", "");
  const commitCount = p.commits.length;
  const commitWord = commitCount === 1 ? "commit" : "commits";
  const message = `[**${p.sender.name}**](${p.sender.html_url}) pushed ${inlineCode(commitCount.toString())} ${commitWord} to branch ${inlineCode(branch)}.`;

  // commits

  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: 0x6e5494,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: `-# [${p.repository.owner.name}](${p.repository.owner.html_url}) - [${p.repository.name}](${env.REPOSITORY_URL})\n-# ${message}`,
      },
      {
        type: ComponentType.Separator,
      },
    ],
  };

  if (p.commits.length > 0) {
    // display up to 10 commits
    const commitComponents: APITextDisplayComponent[] = p.commits.slice(0, 10).map((commit) => ({
      type: ComponentType.TextDisplay,
      content: `- [${commit.id.substring(0, 7)}](${commit.url}) ${commit.author.name}: ${commit.message.split("\n")[0].slice(0, 200)}`,
    }));

    container.components.push(...commitComponents);

    if (p.commits.length > 10) {
      container.components.push({
        type: ComponentType.TextDisplay,
        content: `and ${p.commits.length - 10} more commits...`,
      });
    }
  } else {
    container.components.push({
      type: ComponentType.TextDisplay,
      content: "_No commits in this push. (How did this happen?)_",
    });
  }

  const ar: APIActionRowComponent<APIComponentInMessageActionRow> = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: 5,
        url: env.REPOSITORY_URL,
        label: "View Repository",
      },
      {
        type: ComponentType.Button,
        style: 5,
        url: p.compare,
        label: "View Changes",
      },
    ],
  };

  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        flags: MessageFlags.IsComponentsV2,
        components: [container, ar],
        username: "GitHub",
        avatar_url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      } satisfies RESTPostAPIWebhookWithTokenJSONBody),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("Error sending message to Discord:", { error: inspect(error) });
    return new Response("Error sending message to Discord", { status: 500 });
  }

  return new Response("Webhook processed", { status: 200 });
}
