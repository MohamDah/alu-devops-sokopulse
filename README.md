# SokoPulse

> Real-Time Agricultural Commodity Price Tracker, USSD Gateway & MoMo Trade Simulator for East African Smallholder Farmers

## Security & Branch Protection Governance (Shift-Left DevOps)

`main` is protected. Nothing reaches it except through a reviewed pull request. The rules below are enabled on the repository (Settings > Branches).

| Rule | Setting on `main` | Why it matters |
| --- | --- | --- |
| Require pull request | On | Every change is proposed, discussed and recorded; nobody pushes straight to `main`. |
| 1 approval | At least 1 approving review | A second person sees every change, which shares knowledge and catches mistakes. |
| Dismiss stale approvals | On | If new commits are pushed, the earlier approval no longer counts; reviewers approve what actually merges. |
| Status checks | On (strict). No checks are required yet | Automated checks become merge gates once CI exists. Until then the rule is a placeholder. |
| Up-to-date branches | On | A branch must include the latest `main` before merging, so it is tested against current code. |
| Conversation resolution | On | Review comments must be resolved, not ignored. |
| Include administrators | On | The owner follows the same rules as everyone else. Force pushes and branch deletion are also blocked. |

Supporting files: [`.github/CODEOWNERS`](.github/CODEOWNERS) lists reviewers for core directories, [`.github/pull_request_template.md`](.github/pull_request_template.md) is the PR checklist, and [`.gitignore`](.gitignore) keeps secrets (`.env`), dependencies and Terraform state out of git.

Workflow: branch from `main`, make small [Conventional Commits](https://www.conventionalcommits.org/), open a PR that links its issue, get a review, then merge.
