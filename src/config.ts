export interface WebhookConfig {
  /** The environment variable name that contains the Discord webhook URL */
  discordWebhookEnvVar: string;
}

export interface WebhookRoutes {
  /** Map of subpaths to webhook configurations. Use "/" for default/root path. */
  [subpath: string]: WebhookConfig;
}

/**
 * Configuration for webhook routes.
 *
 * Example setup in .dev.vars:
 * ```
 * DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
 * DISCORD_WEBHOOK_PROJECT1=https://discord.com/api/webhooks/...
 * DISCORD_WEBHOOK_PROJECT2=https://discord.com/api/webhooks/...
 * WEBHOOK_SECRET=your_secret
 * REPOSITORY_URL=https://github.com/user/repo
 * ```
 */
export const webhookRoutes: WebhookRoutes = {
  // Default route - handles requests to "/" or any unmatched subpath
  "/": {
    discordWebhookEnvVar: "DISCORD_WEBHOOK_URL",
  },

  // Example additional routes:
  // "/project1": {
  //   discordWebhookEnvVar: "DISCORD_WEBHOOK_PROJECT1",
  // },
  // "/project2": {
  //   discordWebhookEnvVar: "DISCORD_WEBHOOK_PROJECT2",
  // },
};

/**
 * Get the webhook configuration for a given path.
 * Falls back to the default "/" route if no match is found.
 */
export function getWebhookConfig(path: string, env: Env): string | null {
  // Normalize path (remove trailing slash unless it's just "/")
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "");

  const config = webhookRoutes[normalizedPath] || webhookRoutes["/"];

  if (!config) {
    return null;
  }

  const webhookUrl = env[config.discordWebhookEnvVar as keyof Env] as string | undefined;

  return webhookUrl || null;
}
