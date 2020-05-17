import * as github from "@actions/github";

export class Github {
  private octokit: github.GitHub;
  constructor(
    private token: string,
    private owner: string,
    private repo: string
  ) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.octokit = new github.GitHub(token);
  }

  checkReviewIsRequestChange: ({
    pull_number,
    review_id,
  }: {
    pull_number: number;
    review_id: number;
  }) => Promise<boolean> = async ({ pull_number, review_id }) => {
    const res = await this.octokit.pulls.getReview({
      owner: this.owner,
      repo: this.repo,
      pull_number,
      review_id,
    });
    return res.data.state === "CHANGES_REQUESTED";
  };

  getColNameForLabels: (
    pull_number: number,
    labels: Array<[string, string]>
  ) => Promise<string> = async (pull_number, labels) => {
    const res = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number,
    });
    const moveToLabel = res.data.labels.filter((l) => /move-.*/gm.test(l.name));
    if (moveToLabel.length != 1) return "";
    const colName = labels.find((l) => l[0] === moveToLabel[0].name)?.[1];
    if (!colName) return "";
    return colName;
  };
}
