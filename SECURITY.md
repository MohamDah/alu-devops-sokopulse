# Security checks and findings

Last checked: 10 November 2026.

SokoPulse is a course demo with seeded prices and simulated payments. There is
no connection to a real MoMo provider. Passing these checks does not make it
ready for real users or payments.

## What CI checks

The [CI workflow](.github/workflows/ci.yml) runs on every pull request into
`main` and on pushes to other branches. The required check is still called `ci`.

| Scan | Command or settings | What fails the check |
| --- | --- | --- |
| Dependencies | `npm audit --audit-level=high`, after `npm ci` | HIGH or CRITICAL dependency findings, including development dependencies |
| Container image | Trivy action `v0.36.0`, engine `v0.76.2`, image `sokopulse:ci`, vulnerability scanner | HIGH or CRITICAL findings with an available fix; `ignore-unfixed: true`, exit code 1 |
| Terraform | Same Trivy versions, config scan of `terraform`, using `terraform/terraform.tfvars.example` | HIGH or CRITICAL misconfigurations, exit code 1, except the scoped HTTP exception below |

The image scan needs a successful build, so an earlier failure skips it.
Terraform scanning uses `if: ${{ !cancelled() }}` so it still runs after
another step fails. A failed scan blocks merge through the required `ci`
check. Lower-severity findings do not block merge, but still need review.

No Azure credentials, real Terraform variables or private keys are needed
for these scans. Example inputs help the Terraform scanner evaluate the rules;
they are not usable deployment credentials.

## Findings we fixed

The first image scan in [PR #27](https://github.com/MohamDah/alu-devops-sokopulse/pull/27)
failed. [Run 42787216580](https://github.com/MohamDah/alu-devops-sokopulse/actions/runs/42787216580)
has the original results. It reported 7 HIGH Alpine package findings and
22 npm-bundled package findings (21 HIGH and 1 CRITICAL).
These are package/advisory matches, not 29 separate confirmed application exploits.

| Finding group | IDs reported in the failed scan | What we changed | Owner / review date |
| --- | --- | --- | --- |
| Alpine OpenSSL (`libcrypto3`, `libssl3`) | CVE-2026-14456, CVE-2026-45447 | Added `apk upgrade --no-cache` in the runtime image to install the available OS fixes | Christian / 17 November 2026 |
| Alpine musl and zlib | CVE-2026-107891, CVE-2026-85091 | Same OS package upgrade | Christian / 17 November 2026 |
| npm's bundled `brace-expansion` | CVE-2026-102276, CVE-2026-102278, CVE-2026-13149, CVE-2026-14257, CVE-2026-69152 | Removed npm and npx from the final image | Christian / 17 November 2026 |
| npm's bundled `cross-spawn`, `glob`, `ip-address` | CVE-2024-21538, CVE-2025-64756, CVE-2026-69192 | Same removal of runtime npm | Christian / 17 November 2026 |
| npm's bundled `minimatch` | CVE-2026-26996, CVE-2026-27903, CVE-2026-27904 | Same removal of runtime npm | Christian / 17 November 2026 |
| npm's bundled `pacote`, `sigstore` | CVE-2026-9496, CVE-2026-48815 | Same removal of runtime npm | Christian / 17 November 2026 |
| npm's bundled `tar`, including a CRITICAL finding | CVE-2026-59873 (CRITICAL), CVE-2026-23745, CVE-2026-23950, CVE-2026-24842, CVE-2026-26960, CVE-2026-29786, CVE-2026-31802, CVE-2026-59874, CVE-2026-73566 | Same removal of runtime npm | Christian / 17 November 2026 |

The app starts with `node src/server.js`, so it does not need npm in the
runtime image. npm stays in the build stage to install production dependencies.
We did not remove the application's dependencies or hide these findings with
an image ignore list. See the [Dockerfile](Dockerfile).

The corrected [run 42788307031](https://github.com/MohamDah/alu-devops-sokopulse/actions/runs/42788307031)
passed. The later [Ansible PR run 42792214452](https://github.com/MohamDah/alu-devops-sokopulse/actions/runs/42792214452)
also passed all three security scans, lint, all 76 tests and the image build.
These results apply to the code, image and advisory data used by those runs.
Rebuild and rescan because the base image and advisory databases can change.

## Findings and risks we are accepting for the demo

### Development dependency advisories

On 10 November, `npm audit --json` reported **3 low and 16 moderate** affected
packages, with **0 high and 0 critical**. Most entries are Jest packages that
inherit findings from their dependency tree, not separate root advisories.
The underlying advisory groups were:

| Advisory | Severity | Decision and reason | Owner / review date |
| --- | --- | --- | --- |
| [deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Low | Temporarily accepted in development tooling. Not shipped by `npm ci --omit=dev`. Do not process untrusted test inputs | Mohamed / 17 November 2026 |
| [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | Moderate | Temporarily accepted in the Jest/coverage tree. Plan a compatible tooling update and rerun tests | Mohamed / 17 November 2026 |
| [minimatch denial of service](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Moderate | Same development-only acceptance; not an exemption if a HIGH or CRITICAL finding appears | Mohamed / 17 November 2026 |

`npm audit --omit=dev --json` reported **zero production dependency findings**
on the same date. That does not cover OS packages, the Node runtime or all
possible application bugs.

We have not run `npm audit fix --force`: the current suggestion for parts of
this tree includes replacing Jest with version 25.1.0, a breaking downgrade.
That needs a separate tested change, not a blind fix before submission.

### Public HTTP in Terraform

Trivy rule **AZU-0047** flags the intentionally public HTTP rule.
The exception is directly above `azurerm_network_security_rule.allow_http`
in [terraform/main.tf](terraform/main.tf):

```hcl
# trivy:ignore:AZU-0047:exp:2026-11-30
```

- **Decision:** accepted only for the short-lived assessment demo.
- **Reason:** reviewers need to reach the website without joining a private network.
- **Scope:** this HTTP resource only. It is not a blanket suppression of public
  access checks. The SSH rule still uses `admin_source_cidr`, not the whole internet.
- **Risk:** HTTP is not encrypted. Anyone who can reach the demo can use its
  unauthenticated simulator endpoints.
- **Owner:** Mohamed.
- **Review and expiry:** 30 November 2026, or before any real-data use, whichever
  comes first. Remove the public demo or design proper HTTPS and access controls;
  do not keep extending the exception without reviewing it.

The exception was checked during the Terraform work: the HTTP finding appeared
without it, the scoped ignore suppressed it, and deliberately public SSH was
still reported separately. See [PR #26](https://github.com/MohamDah/alu-devops-sokopulse/pull/26).

### Other limitations

| Risk | Decision and next step | Owner / review date |
| --- | --- | --- |
| Node.js 20 is end-of-life | Accepted only for this course demo. OS upgrades and a green Trivy result do not restore Node support. Upgrade to a supported LTS and test the app before production use | Mohamed / 17 November 2026 |
| Image scanning ignores vulnerabilities without an available fix | Accepted CI policy so an unavailable patch does not permanently block coursework. Review a full scan without `--ignore-unfixed` before release; consider another base image or mitigation for serious findings | Christian / 17 November 2026 |
| No authentication, rate limiting or persistent data | Keep the demo short-lived and use synthetic data only. Anyone can call the simulator; transactions disappear on restart. Real payment use is out of scope | Mohamed / 30 November 2026 |
| Docker-published ports can bypass UFW | Keep the Azure NSG as the outside access control. Only port 80 and source-restricted SSH are allowed. Do not publish extra ports casually | Promesse / 30 November 2026 |
| Old UFW admin CIDRs are not removed automatically | After changing networks, verify a fresh SSH connection, then remove the old rule as explained in the Ansible guide | Promesse / 30 November 2026 |
| Terraform state is local | Only one team member applies changes at a time. Keep state and backups private and do not delete them after a failed apply. Use a protected remote backend before wider team use | Promesse / 30 November 2026 |

## Server checks

The [Ansible guide](ansible/README.md) explains the roles and verification.
The deployment uses key-only SSH with root login disabled, source-restricted
SSH in the NSG and UFW, and a non-root app container. The container has a
read-only filesystem, dropped capabilities, `no-new-privileges`, bounded logs
and a health check.

[PR #28](https://github.com/MohamDah/alu-devops-sokopulse/pull/28) records the
fresh deployment and repeat run: first `changed=10`, then `changed=0`, with
no failures. The verification playbook checked the effective SSH settings,
firewall defaults, container settings and public health/price endpoints.
This is deployment evidence, not a penetration test.

## Rechecking locally

From the repository root, with dependencies installed:

```bash
npm ci
npm audit --audit-level=high
npm audit --omit=dev
docker build -t sokopulse:ci .
trivy image --scanners vuln --severity HIGH,CRITICAL \
  --ignore-unfixed --exit-code 1 sokopulse:ci
trivy config --severity HIGH,CRITICAL --exit-code 1 \
  --tf-vars terraform/terraform.tfvars.example terraform
```

These Trivy commands require the CLI. Use version `0.76.2` to match the current
workflow. For a fuller manual review, leave off `--ignore-unfixed` on the image
scan and include lower severities. Investigate scan errors instead of treating
a failed scan as a clean result.

## Reporting a concern

Contact a team member through GitHub. Do not post private keys, tokens,
Terraform state or personal data in an issue or PR. For sensitive reports,
use GitHub's private vulnerability reporting if it is enabled on the repository;
otherwise arrange a private channel with the maintainer first.
