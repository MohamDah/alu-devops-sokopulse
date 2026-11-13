# AI usage annex

This annex records how we used AI assistance during the SokoPulse project:
what we asked for, what the assistance produced, and how it affected our work.
It supplements the [AI usage disclosure](README.md#ai-usage-disclosure).


## 1. Planning and concept explanations

**Prompt:** Help us draft a plan for the project and explain the
DevOps concepts and tools we are working with.

**Output summary:** AI helped outline what to do and explained the concepts
involved in the project workflow.

**Use and modifications:** We used this as guidance for organising the work
and understanding the tasks, rather than treating the generated plan as a
finished implementation. The project-specific work and decisions are
reflected in the repository.

## 2. Terraform and Azure VM availability

**Prompt:** Our Terraform VM configuration is failing. Help us find
an Azure region and VM size available to the subscription used by the
provider account.

**Output summary:** AI helped investigate the configuration and subscription
constraints. We gave the assistant access to the Azure CLI to debug the
problem and help identify a usable region and VM size.

**Use and modifications:** The assistance informed adjustments to the
Terraform VM configuration so it could use a region and size available to
our subscription. Availability was specific to that account and deployment;
the same settings are not guaranteed to work for every Azure subscription.
The current inputs and related troubleshooting guidance are documented in
the [Terraform guide](terraform/README.md).

## 3. Recovering SSH access after a firewall lockout

**Prompt:** SSH stopped connecting after we ran an Ansible playbook that
configured the firewall. Help us investigate and recover access using
Azure CLI.

**Output summary:** AI investigated the issue using Azure CLI and found
that the firewall restriction used an outdated public IP address for our
administrator connection. It helped us use Azure CLI to run commands
directly inside the VM without relying on SSH, and correct the restriction.

**Use and modifications:** We used the recovery commands to fix the
server's firewall and restore SSH access. The mistake concerned our
administrator connection's source public IP, not the VM's destination
address. The intended configuration remained source-restricted SSH, not
unrestricted access. The [Ansible guide](ansible/README.md) documents the
need to keep the administrator CIDR current and consistent with Terraform.

## 4. README documentation

**Prompt:** Help us write and improve the project's README.

**Output summary:** AI assisted with drafting and explaining the project
documentation.

**Use and modifications:** We used AI-generated wording in preparing the
[README](README.md). The documentation describes the project's application,
workflow and deployment setup. This annex does not reconstruct individual
wording changes or claim that every generated instruction was independently
verified.

## 5. This AI usage annex

**Prompt:** Help us draft and refine this annex, improving its structure,
wording and formatting while keeping the recorded project activities
accurate and consistent with the repository documentation.

**Output summary:** AI helped organise the annex into a clearer structure
and suggested wording improvements for readability, consistency and grammar.

**Use and modifications:** We used the assistant to improve the wording and
layout of this document, rather than to generate the underlying project
facts. The final text was reviewed and adjusted by the team to match the
actual work completed, the project documentation and the course reporting
requirements.

## Responsibility and limitations

AI supported our planning, learning, troubleshooting and writing; it did
not replace our responsibility for the submitted work. We remain
responsible for reviewing, testing and understanding what we submit and obtaining teammate review.
CLI-assisted troubleshooting could affect real Azure resources, so suggested
commands require particular care. Credentials, private keys and other
sensitive account details are not included in this annex.
