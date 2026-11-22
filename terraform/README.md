# Terraform: Summative Azure infrastructure

The Terraform root now describes a clean Summative environment in the existing
SokoPulse resource group. The previous Formative 3 single-VM resources are no
longer in the configuration, but remain in the local Terraform state and Azure
until a reviewed plan is applied.

**Do not apply a plan until you have checked its destroy/create actions and
estimated the ongoing cost.** No Azure resources were changed while preparing
this configuration.

## Architecture

```text
Internet --HTTP:80--> Standard Load Balancer --> private app VM:3000
                           |                         |
                           |                         +--> authenticated ACR
                           |                              (managed identity)
                           |
                           +--> health probe: /api/ready

Admin IP --SSH:22--> public jumpbox --SSH:22--> private app VM
                                                 |
                                                 +-- PostgreSQL:5432
                                                     private subnet
```

The VNet has separate jumpbox, app and delegated PostgreSQL subnets. The app VM
has no public IP. The load balancer also provides its outbound access for
package and image downloads. PostgreSQL has public access disabled. ACR has
admin credentials disabled; its public endpoint requires authenticated access.

| Resource | Purpose |
| --- | --- |
| Resource group | Contains the Summative resources |
| VNet, subnets and NSGs | Separate jumpbox, private app and PostgreSQL traffic |
| Public jumpbox VM | SSH entry point restricted to `admin_source_cidr` |
| Private app VM | Runs SokoPulse without a public IP |
| Standard Load Balancer | Public HTTP entry point and app VM outbound path |
| PostgreSQL Flexible Server | Private persistent storage for MoMo transactions |
| Azure Container Registry | Stores the app image; app VM pulls with its managed identity |

## Prerequisites

- Terraform 1.5 or newer
- Azure CLI signed in to the intended subscription
- An SSH key pair; only the **public** key is supplied to Terraform
- A globally unique PostgreSQL server name and ACR name

Terraform uses the Azure CLI login:

```bash
az login
az account show
```

Check the selected subscription and region before planning.

## Inputs

Set values in the local, git-ignored `terraform.tfvars` file or through
`TF_VAR_...` environment variables. Never commit real credentials or private
SSH keys.

| Variable | Meaning | Default |
| --- | --- | --- |
| `project_name` | Prefix for resource names | `sokopulse` |
| `location` | Azure region | `southafricanorth` |
| `vm_size` | Size used for both VMs | `Standard_B2ats_v2` |
| `admin_username` | Linux admin account | `azureuser` |
| `admin_ssh_public_key` | Contents of the SSH public key | required |
| `admin_source_cidr` | IPv4 CIDR allowed to SSH to the jumpbox | required |
| `database_server_name` | Globally unique PostgreSQL server name | required |
| `database_admin_username` | PostgreSQL administrator login | required |
| `database_admin_password` | PostgreSQL administrator password | required, sensitive |
| `container_registry_name` | Globally unique lowercase ACR name | required |

Terraform marks the database password sensitive for display, but Terraform
state can still contain it. Keep state private and out of Git.

## Validate and plan

```bash
terraform -chdir=terraform init
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform validate
terraform -chdir=terraform plan
```

The plan is read-only. Because the previous single-VM configuration is still
in state but no longer in the root configuration, expect the plan to propose
destroying those old resources and creating the Summative stack. Review every
destroy, replacement and create operation before applying. Do not delete the
state file to hide those changes.

The current estimate must be checked against the Azure subscription credit
before any apply. VMs, disks, PostgreSQL, public IPs and the load balancer can
incur charges while provisioned.

## Outputs

After an approved apply, useful outputs include:

| Output | Meaning |
| --- | --- |
| `app_url` | Public HTTP address of the load balancer |
| `jumpbox_ssh_command` | SSH command for the public jumpbox |
| `summative_database_host`, `summative_database_name` | Private PostgreSQL endpoint and database |
| `container_registry_login_server` | ACR login server |
| `app_vm_id`, `jumpbox_vm_id` | VM resource IDs |

## State and cleanup

Terraform state is local and git-ignored in this course setup. It tracks real
resources and sensitive database settings. Keep it private, do not commit or
delete it, and do not run concurrent applies.

Destroying the infrastructure is also a state-changing operation. First
generate and inspect a destroy plan; do not run `terraform destroy` without
reviewing the exact resources it will remove.
