import * as core from "@actions/core";
import { getArgs } from "./get-args";
import { ParsedResult } from "./interfaces";
import * as github from "@actions/github";
import { Github } from "./github";
import { handleTransitionIssue } from "./handlers";
import * as Webhooks from "@octokit/webhooks";

async function run() {
  try {
    const { parsedInput, success, exit, message } = getArgs() as ParsedResult;
    if (!parsedInput && !success && exit && message) {
      core.warning(message);
    } else if (!parsedInput) {
      throw new Error("Error trying to parse input.");
    } else {
      const context = github.context;
      const {
        repo: { owner, repo },
        payload,
        eventName,
      } = context;
      core.info(`Event: ${eventName}`);
      core.info(`Action: ${payload.action}`);
      if (
        eventName === "pull_request" &&
        payload.action === "review_requested"
      ) {
        const {
          pull_request: {
            head: { ref },
          },
        } = payload as Webhooks.WebhookPayloadPullRequest;
        core.info(`Branch name: ${ref}`);
        await handleTransitionIssue({
          ...parsedInput,
          colName: parsedInput.columnToMoveToWhenReviewRequested,
          branchName: ref,
        });
      } else if (
        eventName === "pull_request_review" &&
        payload.action === "submitted"
      ) {
        const {
          pull_request: {
            number,
            head: { ref },
          },
          review: { id },
        } = context.payload as Webhooks.WebhookPayloadPullRequestReview;
        const { githubToken } = parsedInput;
        const githubWrapper = new Github(githubToken, owner, repo);
        const isRequestChange = await githubWrapper.checkReviewIsRequestChange({
          pull_number: number,
          review_id: id,
        });
        if (isRequestChange) {
          core.info(`Branch name: ${ref}`);
          await handleTransitionIssue({
            ...parsedInput,
            colName: parsedInput.columnToMoveToWhenChangesRequested,
            branchName: ref,
          });
        }
      } else if (eventName === "pull_request" && payload.action === "closed") {
        const {
          pull_request: {
            merged,
            head: { ref },
          },
        } = payload as Webhooks.WebhookPayloadPullRequest;
        if (merged && parsedInput.columnToMoveToWhenMerged) {
          core.info(`Branch name: ${ref}`);
          await handleTransitionIssue({
            ...parsedInput,
            colName: parsedInput.columnToMoveToWhenMerged,
            branchName: ref,
          });
        }
      } else {
        // you must be here because of triggering labels
        const triggerLabels = await parsedInput.resolveTriggerLabelsFunc();
        triggerLabels.forEach((label) => {
          core.info(`${label[0]}: ${label[1]}`);
        });
        if (triggerLabels.length > 0) {
          const {
            pull_request: {
              number,
              head: { ref },
            },
          } = context.payload as Webhooks.WebhookPayloadPullRequestReview;
          const { githubToken } = parsedInput;
          const githubWrapper = new Github(githubToken, owner, repo);
          const colName = await githubWrapper.getColNameForLabels(
            number,
            triggerLabels
          );
          if (!colName) return;
          core.info(`Colname: ${colName}`);
          core.info(`Ref: ${ref}`);
          handleTransitionIssue({ ...parsedInput, branchName: ref, colName });
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
