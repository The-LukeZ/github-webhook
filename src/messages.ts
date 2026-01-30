import {
  APIActionRowComponent,
  APIComponentInMessageActionRow,
  APIContainerComponent,
  APIMessageTopLevelComponent,
  APITextDisplayComponent,
  ComponentType,
  MessageFlags,
  RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import { Commit } from "./types";

const color = 0x6e5494;
const githubIconUrl = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";

const TextDisplay = (...content: string[]): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content: content.join("\n"),
});

const subtext = (text: string): string => `\`${text}\`` as const;

function buildDiscordMessage(...components: APIMessageTopLevelComponent[]): RESTPostAPIWebhookWithTokenJSONBody {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: components,
    username: "GitHub",
    avatar_url: githubIconUrl,
  };
}

export function buildBranchActionMessage(
  action: "created" | "deleted",
  ownerNameOrLogin: string,
  ownerHtmlUrl: string,
  repoName: string,
  repoHtmlUrl: string,
  senderNameOrLogin: string,
  senderHtmlUrl: string,
  branchName: string,
  branchHtmlUrl: string
) {
  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: color,
    components: [
      TextDisplay(
        `### [${ownerNameOrLogin}](${ownerHtmlUrl}) - [${repoName}](${repoHtmlUrl})`,
        `[**${senderNameOrLogin}**](${senderHtmlUrl}) ${action} branch [${subtext(branchName)}](${branchHtmlUrl}).`
      ),
    ],
  };
  const ar: APIActionRowComponent<APIComponentInMessageActionRow> = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: 5,
        url: repoHtmlUrl,
        label: "View Repository",
      },
    ],
  };

  if (action === "created") {
    ar.components.push({
      type: ComponentType.Button,
      style: 5,
      url: branchHtmlUrl,
      label: "View Branch",
    });
  }

  return buildDiscordMessage(container, ar);
}

export function buildCommitPushMessage(
  ownerNameOrLogin: string,
  ownerHtmlUrl: string,
  repoName: string,
  repoHtmlUrl: string,
  compareUrl: string,
  senderNameOrLogin: string,
  senderHtmlUrl: string,
  commits: Commit[],
  branchName: string
) {
  const commitCount = commits.length;
  const commitWord = commitCount === 1 ? "commit" : "commits";
  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: color,
    components: [
      TextDisplay(
        `### [${ownerNameOrLogin}](${ownerHtmlUrl}) - [${repoName}](${repoHtmlUrl})\n` +
          `-# [**${senderNameOrLogin}**](${senderHtmlUrl}) pushed \`${commitCount}\` ${commitWord} to \`${branchName}\`.`
      ),
    ],
  };

  if (commitCount > 0) {
    // display up to 10 commits
    const commitComponents: APITextDisplayComponent[] = commits.slice(0, 10).map((commit) => ({
      type: ComponentType.TextDisplay,
      content: `- [\`${commit.id.substring(0, 7)}\`](${commit.url}) ${commit.author.name}: ${commit.message.split("\n")[0].slice(0, 200)}`,
    }));

    container.components.push(...commitComponents);

    if (commits.length > 10) {
      container.components.push({
        type: ComponentType.TextDisplay,
        content: `and ${commits.length - 10} more commits...`,
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
        url: repoHtmlUrl,
        label: "View Repository",
      },
      {
        type: ComponentType.Button,
        style: 5,
        url: compareUrl,
        label: "View Changes",
      },
    ],
  };

  return buildDiscordMessage(container, ar);
}

export function buildTagActionMessage(
  action: "created" | "deleted",
  ownerNameOrLogin: string,
  ownerHtmlUrl: string,
  repoName: string,
  repoHtmlUrl: string,
  senderNameOrLogin: string,
  senderHtmlUrl: string,
  tagName: string,
  tagHtmlUrl: string
) {
  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: color,
    components: [
      TextDisplay(
        `### [${ownerNameOrLogin}](${ownerHtmlUrl}) - [${repoName}](${repoHtmlUrl})`,
        `[**${senderNameOrLogin}**](${senderHtmlUrl}) ${action} tag [${subtext(tagName)}](${tagHtmlUrl}).`
      ),
    ],
  };
  const ar: APIActionRowComponent<APIComponentInMessageActionRow> = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: 5,
        url: repoHtmlUrl,
        label: "View Repository",
      },
    ],
  };

  if (action === "created") {
    ar.components.push({
      type: ComponentType.Button,
      style: 5,
      url: tagHtmlUrl,
      label: "View Tag",
    });
  }

  return buildDiscordMessage(container, ar);
}
