import { JiraClient } from "./jira";
import { HandleTransitionParams } from "./interfaces";
import { warning } from "@actions/core";

const handleTransitionIssue = async ({
  jiraTokenEncoded,
  jiraEndpoint,
  jiraIssueId,
  colName
}: HandleTransitionParams) => {
  const jira = new JiraClient(jiraTokenEncoded);
  const issueDetail = await jira.request(
    `${jiraEndpoint}/rest/api/3/issue/${jiraIssueId}`
  );
  console.log(issueDetail);
  const {
    fields: {
      status: { name }
    }
  } = issueDetail;
  if (name === colName) {
    warning(`
      The issue ${jiraIssueId} is already in status ${colName}.
      Action will exit without doing anything.  
    `);
  } else {
    const availableTransitions = await jira.request(
      `${jiraEndpoint}/rest/api/3/issue/${jiraIssueId}/transitions`
    );
    const transitionId = availableTransitions.transitions?.find(
      (t: any) => t.to.name === colName
    )?.id;
    if (!transitionId)
      throw new Error(`
    There was an error trying to transition issue ${jiraIssueId}:
    Transition to status "${colName}" cannot be found.
    Check all of the transitions' rules, conditions of yourr project's workflow.
    See more: https://confluence.atlassian.com/adminjiraserver073/working-with-workflows-861253510.html
  `);
    await jira.request(
      `${jiraEndpoint}/rest/api/3/issue/${jiraIssueId}/transitions`,
      "POST",
      { transition: { id: transitionId } }
    );
  }
};

export { handleTransitionIssue };
