# Github Wehbook for Cloudflare Workers x Discord Webhooks

Receive GitHub `push` webhook events and post them to Discord.

**Example:**

<img width="750" height="311" alt="image" src="https://github.com/user-attachments/assets/62477424-4d33-4787-9827-51d769ebc532" />

### Environment Variables

Make a `.dev.vars` file in the root directory with the following variables:

```bash
DISCORD_WEBHOOK_URL=your_discord_webhook_url # Discord webhook URL where messages will be sent
WEBHOOK_SECRET=your_github_webhook_secret # for verifying incoming requests - Generate this e.g. here: https://passwords-generator.org/
REPOSITORY_URL=your_github_repository_url # Will be used to redirect non-POST requests to the repository
```
