# Security checks

Last checked: 10 November 2026.

## Scans in CI

Our [CI workflow](.github/workflows/ci.yml) includes three security scans on
every pull request into `main` and on pushes to other branches.

| Scan | Tool | When it fails |
| --- | --- | --- |
| Dependencies | `npm audit --audit-level=high` | HIGH or CRITICAL findings |
| Container image | Trivy | HIGH or CRITICAL vulnerabilities with an available fix |
| Terraform | Trivy | HIGH or CRITICAL misconfigurations, apart from the HTTP exception below |

A failed scan blocks merging through the required `ci` check. The image scan
needs the earlier steps and build to pass. The Terraform scan still runs
after an earlier failure unless the workflow is cancelled.

## What we found and fixed

The first image scan
failed with 7 HIGH OS-package findings and 22 findings in npm's bundled
packages, including 1 CRITICAL finding.

We added `apk upgrade --no-cache` to update the affected OS packages.
We also removed npm and npx from the final image because the app starts
directly with Node and does not need them at runtime.

The scan after these changes
passed. The later Ansible PR checks
also passed all three scans, the image build and all 76 tests.

## Remaining findings and demo limitations

- **Development dependencies:** npm audit reported 3 low and 16 moderate
  affected packages in the Jest tooling tree. Production dependencies reported
  zero findings. We are accepting these for now because they are not shipped
  in the runtime image. We avoided `npm audit fix --force` because its suggested
  Jest downgrade is a breaking change that needs separate testing.
- **Public HTTP:** Terraform allows port 80 so reviewers can open the demo.
  Trivy rule `AZU-0047` is ignored only for this rule, with an expiry of
  **30 November 2026**. SSH stays restricted to the admin CIDR. HTTP is not
  encrypted, so we only use synthetic data.
- **Unfixed image vulnerabilities:** CI ignores findings without an available
  fix so an unavailable patch does not permanently block coursework.
  A full scan without `--ignore-unfixed` is needed before a real release.
- **Node.js 20:** it is end-of-life. We kept it for this assignment, but need
  to upgrade to a supported version and test it before production use.

This is a short-lived course demo, not a real payment service. It has no
authentication or rate limiting, and transactions reset on restart.
Do not enter real phone numbers or payment details.

See the [Ansible guide](ansible/README.md) for SSH, firewall and container
hardening. Passing scans does not mean the app has no security problems.
