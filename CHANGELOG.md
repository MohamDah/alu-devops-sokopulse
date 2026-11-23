# Changelog

This file records the main changes made across the course formative projects
and the Summative pipeline.

## Formative 1 — Project foundation

- Created the SokoPulse price tracker, USSD menu simulator and MoMo settlement
  simulator.
- Added the initial service-oriented Express structure, seeded market data and
  automated tests.
- Established repository collaboration files, including ownership, pull
  request guidance and branch-protection documentation.

## Formative 2 — Containerization and CI

- Added the production Docker image and Docker Compose configuration.
- Added linting and automated tests to GitHub Actions.
- Documented the CI pipeline, setup and validation process.

## Formative 3 — Infrastructure and security

- Added Azure Terraform infrastructure and Ansible-based VM configuration.
- Added dependency, container-image and Terraform security scans.
- Documented scan findings, remediation and accepted demo risks.

## Summative — In progress

- Added PostgreSQL-backed MoMo transaction storage and a database readiness
  check.
- Added a private managed PostgreSQL server in Spain Central, VNet peering,
  private DNS and database network rules.
- Added Ansible deployment support for Docker Compose and SHA-tagged ACR images.
- Drafted a main-branch GitHub Actions CD workflow; its GitHub identity,
  repository settings, live deployment and end-to-end run are not yet verified.
