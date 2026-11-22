# Terraform: Summative Azure infrastructure

The Terraform root describes the Summative environment in the SokoPulse
resource group. The previous Formative 3 single-VM resources have been removed.

**Always review a plan's destroy/create actions before applying it.**

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
                                                 +-- PostgreSQL container
                                                     (not exposed)
```

The VNet has separate jumpbox and app subnets. The app VM has no public IP. The
load balancer also provides its outbound access for package and image
downloads. ACR has admin credentials disabled; its public endpoint requires
authenticated access.

PostgreSQL runs as a container on the private app VM and is deployed with
Ansible, not Terraform. Azure Database for PostgreSQL Flexible Server was
tried first, but South Africa North had no capacity for the Burstable sizes
available to this subscription (`RegionalAllocationFailed`).

| Resource | Purpose |
| --- | --- |
| Resource group | Contains the Summative resources |
| VNet, subnets and NSGs | Separate jumpbox and private app traffic |
| Public jumpbox VM | SSH entry point restricted to `admin_source_cidr` |
| Private app VM | Runs SokoPulse without a public IP |
| Standard Load Balancer | Public HTTP entry point and app VM outbound path |
| Azure Container Registry | Stores the app image; app VM pulls with its managed identity |

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
| `container_registry_login_server` | ACR login server |
| `app_vm_id`, `jumpbox_vm_id` | VM resource IDs |

## State and cleanup

Terraform state is local and git-ignored in this course setup. It tracks real
resources and may contain sensitive values. Keep it private, do not commit or
delete it, and do not run concurrent applies.

Destroying the infrastructure is also a state-changing operation. First
generate and inspect a destroy plan; do not run `terraform destroy` without
reviewing the exact resources it will remove.
