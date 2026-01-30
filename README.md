# Github Wehbook for Cloudflare Workers x Discord Webhooks

Receive GitHub `push` webhook events and post them to Discord.

**Example:**

<img width="750" height="311" alt="image" src="https://github.com/user-attachments/assets/62477424-4d33-4787-9827-51d769ebc532" />

## Deployment

### Prequisites

- [Cloudflare account](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
- [pnpm package manager](https://pnpm.io/installation)

The rest comes with the project as dependencies.

### Steps

1. Fork this repository and clone it to your local machine.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Login to Cloudflare Workers:

   ```bash
   pnpx wrangler login
   ```

4. Set up [env variables](#environment-variables).
5. Publish to Cloudflare Workers:

   ```bash
   pnpm run deploy
   ```

### Environment Variables

Make a `.dev.vars` file in the root directory with the following variables:

```bash
# Required variables
WEBHOOK_SECRET=your_github_webhook_secret # for verifying incoming requests - Generate this e.g. here: https://passwords-generator.org/
REDIRECT_URL=your_github_REDIRECT_URL # Will be used to redirect non-POST requests

# Discord webhook URLs - you can add as many as you need
DISCORD_WEBHOOK_URL=your_default_discord_webhook_url # Default webhook for "/" route
# DISCORD_WEBHOOK_PROJECT1=your_project1_discord_webhook_url # Optional: for "/project1" route
# DISCORD_WEBHOOK_PROJECT2=your_project2_discord_webhook_url # Optional: for "/project2" route
```

Then run the command `pnpm run bulk-env` to automatically upload the env variables to the worker.

`.dev.vars` is a convention used by `wrangler` to load environment variables during development. It is excluded from version control by default.

### Configuring Multiple Webhooks

Edit `src/config.ts` to map subpaths to Discord webhook URLs:

```typescript
export const webhookRoutes: WebhookRoutes = {
  "/": {
    discordWebhookEnvVar: "DISCORD_WEBHOOK_URL",
  },
  "/project1": {
    discordWebhookEnvVar: "DISCORD_WEBHOOK_PROJECT1",
  },
  "/project2": {
    discordWebhookEnvVar: "DISCORD_WEBHOOK_PROJECT2",
  },
};
```

Then configure your GitHub webhooks to point to:

- `https://your-worker.workers.dev/` (uses DISCORD_WEBHOOK_DEFAULT)
- `https://your-worker.workers.dev/project1` (uses DISCORD_WEBHOOK_PROJECT1)
- `https://your-worker.workers.dev/project2` (uses DISCORD_WEBHOOK_PROJECT2)

If a subpath isn't configured, it will fall back to the default "/" route.

> [!IMPORTANT]
> You don't have to name the env vars exactly as shown. Just ensure the names in `config.ts` match those in your `.dev.vars` file - which should be set in your worker with the `pnpm run bulk-env` command again.
