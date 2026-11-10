# Terraform: Azure infrastructure for SokoPulse

This folder creates the Azure resources the app runs on. Terraform builds the infrastructure only. The `ansible/` folder then configures the server and deploys the container.

## What it creates

```text
Internet
   |  HTTP :80 (open to everyone)      SSH :22 (only your address)
   v
Public IP --> Network interface --> Virtual machine (Ubuntu 22.04)
                                     |
              Subnet <-- Network security group (the two rules above)
                 |
          Virtual network      (all inside one resource group)
```

| Resource | Purpose |
| --- | --- |
| Resource group | Holds everything, so one `destroy` removes it all |
| Virtual network and subnet | The private network (`10.0.0.0/16`, subnet `10.0.1.0/24`) |
| Network security group and rules | Allows HTTP from anywhere and SSH only from `admin_source_cidr`; attached to the subnet |
| Public IP (static) and network interface | Gives the VM a fixed public address |
| Linux virtual machine | Ubuntu 22.04, key-only login (no password) |

Dependencies are handled by Terraform: each resource refers to the ones it needs (for example the NIC uses `azurerm_subnet.main.id`), so it builds them in the right order.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) 1.5 or newer
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) and an Azure subscription
- An SSH key pair. To create one: `ssh-keygen -t ed25519 -f ~/.ssh/sokopulse`

## Sign in to Azure

Terraform uses your Azure CLI login. No credentials are stored in this repository.

```bash
az login
export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
```

## Inputs

Copy the example and edit it. `terraform.tfvars` is git-ignored, so your values stay on your machine.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

| Variable | Meaning | Default |
| --- | --- | --- |
| `project_name` | Prefix for resource names | `sokopulse` |
| `location` | Azure region | `southafricanorth` |
| `vm_size` | VM size | `Standard_B2ats_v2` |
| `admin_username` | Admin account on the VM | `azureuser` |
| `admin_ssh_public_key` | Contents of your **public** key file | none, required |
| `admin_source_cidr` | Address allowed to SSH, such as `203.0.113.10/32` | none, required |

`admin_ssh_public_key` must start with `ssh-rsa` or `ssh-ed25519`, and `admin_source_cidr` cannot be `0.0.0.0/0`. Terraform rejects other values. A private key must never go in any Terraform file.

**Finding the right SSH address.** Use the address your SSH connection really comes from. A VPN or proxy can make a website such as an "what is my IP" page show a different address than SSH uses. If the first SSH attempt is blocked, connect another way and run `echo $SSH_CONNECTION` on the VM. The first value is your real source address.

## Deploy

```bash
terraform init          # downloads the Azure provider
terraform fmt -check    # formatting check
terraform validate      # checks the configuration
terraform plan -out tfplan   # shows what will be created, changes nothing
terraform apply tfplan  # creates the resources
```

Read the plan before applying. Creating the VM takes a few minutes.

## Outputs

```bash
terraform output                    # all outputs
terraform output -raw public_ip_address
```

| Output | Meaning |
| --- | --- |
| `public_ip_address` | Public IP of the VM |
| `app_url` | `http://` address of the app (after Ansible deploys it) |
| `ssh_command` | Ready-to-use SSH command |
| `resource_group_name`, `resource_group_id` | The resource group |
| `virtual_network_id`, `subnet_id` | The network |
| `network_security_group_id` | The firewall rules |
| `public_ip_id`, `vm_id` | The public IP and the VM |

Next, go to `ansible/` to configure the server.

## State

Terraform keeps a record of what it created in `terraform.tfstate`. It is stored locally in this folder and is git-ignored, because it contains resource details. Do not commit it, and only one person should run `apply` at a time. If an `apply` stops halfway, **keep the state file**, fix the cause and run `plan` again. Deleting it makes Terraform lose track of resources that already exist.

`.terraform.lock.hcl` is committed on purpose. It pins the provider version so everyone gets the same one.

## Troubleshooting

- **`SkuNotAvailable`:** the VM size is not available in that region for your subscription. List the sizes: `az vm list-skus --location southafricanorth --size Standard_B2ats --all -o table`. A listed size is not a guarantee of live capacity. Changing region or size replaces the VM, so read the plan first.
- **`RequestDisallowedByPolicy`:** your subscription restricts the allowed regions. Check: `az policy assignment list -o table`.
- **Cannot SSH:** see the note about the SSH address above.

## Cost and cleanup

The VM, disk and static public IP are billed while they exist, even if the app is idle. When you have finished:

```bash
terraform destroy
```

## Security notes

- HTTP on port 80 is open to everyone on purpose, so the demo can be reached. It is not encrypted, so only use synthetic data.
- The security scanner reports this rule as AZU-0047. The exception is placed on that single rule in `main.tf`, expires on 2026-11-30, and is explained in `SECURITY.md`.
- SSH is limited to one address, password login is disabled, and the VM only accepts your key.
