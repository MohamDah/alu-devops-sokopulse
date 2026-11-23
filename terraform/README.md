# Terraform: Summative Azure infrastructure

The Terraform root describes the Summative environment in the SokoPulse
resource group. The previous Formative 3 single-VM resources have been removed.

**Always review a plan's destroy/create actions before applying it.**

## Architecture

```text
Internet --HTTP:80--> Standard Load Balancer --> private app VM:3000
                           |                         |
                           +--> health probe: /api/ready

Admin IP --SSH:22--> public jumpbox --SSH:22--> private app VM

private app VM --VNet peering, TLS:5432--> Azure PostgreSQL Flexible Server
 (South Africa North)                       (Spain Central, private subnet)

Admin laptop --Ansible/image archive via SSH ProxyJump--> private app VM
```

The VNet has separate jumpbox and app subnets. The app VM has no public IP. The
load balancer also provides its outbound access for package and image
downloads. ACR has admin credentials disabled; its public endpoint requires
authenticated access. Manual Ansible deployment defaults to a local image
archive; it can also pull SHA-tagged images from ACR using the app VM's
managed identity. The merge-to-main CD workflow is still pending.

The managed database is Azure Database for PostgreSQL Flexible Server
(Burstable B1ms, PostgreSQL 16, 7-day backups) in Spain Central. South Africa
North returned `RegionalAllocationFailed` for every Burstable size allowed by
the subscription, so the database has its own VNet in Spain Central, peered
with the app VNet. It has no public access: it is injected into a delegated
subnet whose NSG accepts port 5432 only from the app subnet, and a private DNS
zone linked to both VNets resolves its hostname to a private address. The NSG
also permits PostgreSQL traffic within its delegated subnet as required by
Azure. Traffic between regions stays on the Azure backbone and the app connects
over TLS.

| Resource | Purpose |
| --- | --- |
| Resource group | Contains the Summative resources |
| VNet, subnets and NSGs | Separate jumpbox and private app traffic |
| Public jumpbox VM | SSH entry point restricted to `admin_source_cidr` |
| Private app VM | Runs SokoPulse without a public IP |
| Standard Load Balancer | Public HTTP entry point and app VM outbound path |
| Database VNet, peering, private DNS | Private path from the app subnet to PostgreSQL |
| PostgreSQL Flexible Server | Managed database for MoMo transactions |
| Azure Container Registry | Reserved for image publishing in a later CI/CD workflow |

## Prerequisites

- Terraform 1.5 or newer
- Azure CLI signed in to the intended subscription
- An SSH key pair; only the **public** key is supplied to Terraform
- A globally unique ACR name

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
| `container_registry_name` | Globally unique lowercase ACR name | required |
| `database_location` | Region for PostgreSQL | `spaincentral` |
| `database_server_name` | Globally unique PostgreSQL server name | required |
| `database_admin_username` | PostgreSQL admin login | `sokopulseadmin` |
| `database_admin_password` | 20+ letters, numbers, `_` or `-` | required |

Terraform state can contain sensitive values. Keep it private and out of Git.

## Validate and plan

```bash
terraform -chdir=terraform init
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform validate
terraform -chdir=terraform plan
```

The plan is read-only. Review every destroy, replacement and create operation
before applying. Do not delete the state file to hide changes.

VMs, disks, public IPs and the load balancer are billed hourly while
provisioned, so destroy the stack after the demo.

## Outputs

After an approved apply, useful outputs include:

| Output | Meaning |
| --- | --- |
| `app_url` | Public HTTP address of the load balancer |
| `jumpbox_ssh_command` | SSH command for the public jumpbox |
| `ansible_inventory` | Dynamic Ansible inventory with jumpbox ProxyJump |
| `container_registry_login_server` | ACR login server |
| `app_vm_id`, `jumpbox_vm_id` | VM resource IDs |

## State and cleanup

Terraform state is local and git-ignored in this course setup. It tracks real
resources and may contain sensitive values. Keep it private, do not commit or
delete it, and do not run concurrent applies.

Destroying the infrastructure is also a state-changing operation. First
generate and inspect a destroy plan; do not run `terraform destroy` without
reviewing the exact resources it will remove.
