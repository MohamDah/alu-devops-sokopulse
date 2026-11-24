# Ansible deployment

Ansible configures the private Ubuntu app VM through the public jumpbox. It
installs Docker Compose and deploys SokoPulse, which stores MoMo transactions
in the managed Azure PostgreSQL server created by Terraform. The app reaches
the database over VNet peering and TLS; the database has no public access.
Ansible supports a local image archive for manual deployment and a SHA-tagged
ACR image for the automated deployment workflow.

## Prerequisites

- Apply Terraform first; see the [Terraform guide](../terraform/README.md).
- Install Ansible Core 2.19 or newer, Terraform, Docker with Buildx, and the
  collections in `requirements.yml`.
- Use the SSH private key matching the public key configured in Terraform.
- Confirm `admin_source_cidr` in Terraform matches the public IP from which
  you'll connect to the jumpbox.

From the repository root:

```bash
ansible-galaxy collection install -r ansible/requirements.yml
ansible-inventory -i ansible/inventory.sh --graph
```

The inventory script reads `ansible_inventory` from Terraform. It targets the
app VM's private address and configures SSH `ProxyJump` through the jumpbox.
Terraform must have been applied and the jumpbox must be reachable first.
The inventory includes the managed database host, name and user from the
applied Terraform configuration.

On the first SSH connection, connect to the jumpbox and verify its host
fingerprint before accepting it:

```bash
terraform -chdir=terraform output -raw jumpbox_ssh_command
```

Run the printed command and verify the fingerprint through a trusted channel.
Ansible then connects to the private VM through that jumpbox. Do not disable SSH
host-key checking. If your key is not loaded in `ssh-agent`, add
`--private-key ~/.ssh/YOUR_KEY` to the Ansible commands.

## Build and deploy

Build for the Azure VM's amd64 CPU, including when the laptop uses Apple
Silicon:

```bash
docker build --platform linux/amd64 -t sokopulse:summative .
docker save -o sokopulse-image.tar sokopulse:summative
ansible-playbook -i ansible/inventory.sh ansible/playbook.yml --syntax-check
ansible-playbook -i ansible/inventory.sh ansible/playbook.yml
```

Ansible prompts for the PostgreSQL admin password and confirmation. Enter the
`database_admin_password` from your local `terraform.tfvars`. The database
host, name and user come from the Terraform inventory. The password is not
stored in the repository, and secret-bearing container tasks are hidden from
Ansible output. It is written to a root-owned, mode-0600 Compose environment
file on the VM.

Azure manages the database, its storage and its backups, so transactions
persist across app restarts and redeployments. Ansible removes the earlier
`sokopulse-postgres` container but keeps its `sokopulse-postgres-data` volume.

For an image already pushed to ACR with its full Git commit SHA as the tag,
deploy in registry mode instead of using the local archive:

```bash
ansible-playbook -i ansible/inventory.sh ansible/playbook.yml \
  -e deploy_from_acr=true \
  -e image_tag="$(git rev-parse HEAD)"
```

In this mode, the app VM signs in with its system-assigned managed identity,
which Terraform grants the `AcrPull` role. Ansible pulls the image before
replacing the running container, then logs out of ACR. The image must already
exist in the registry. The merge-to-main CD workflow uses this ACR deployment
path and completed a successful end-to-end run; see the root
[README](../README.md#continuous-deployment) for its configuration and run
details.

After deployment, verify the host and public endpoints:

```bash
ansible-playbook -i ansible/inventory.sh ansible/verify.yml
curl --fail "$(terraform -chdir=terraform output -raw app_url)/api/ready"
```

The readiness endpoint must report `"status":"ready"` and
`"database":"postgres"`. Repeating the playbook with the same settings is
idempotent. Local archive deployments can override `app_image` and
`app_archive`.

## What gets configured

- Docker starts at boot; the app container uses `unless-stopped`.
- The app container is managed by Docker Compose and uses the health check
  baked into its image.
- The app connects to Azure PostgreSQL with TLS certificate verification.
- The app container runs as the non-root `node` user, with a read-only
  filesystem, no Linux capabilities, and bounded Docker logs.
- UFW allows SSH only from the jumpbox subnet and app traffic on port 3000.
  The VM has no public IP; Azure Load Balancer and NSG provide the public
  application entry point.
- SSH password/root login and X11 forwarding are disabled. The config is
  checked before reload, then Ansible reconnects through the jumpbox.
- Ansible checks database-backed readiness after deployment and prints
  container logs if deployment fails.

This is a plain HTTP demo, not a real payment system. Do not enter real payment
details.

## Troubleshooting and cleanup

- SSH timeout: check the VM is running, your source CIDR and the jumpbox NSG.
  Do not open SSH to the whole internet.
- Missing image: rerun `docker save` and check `app_image` matches the archive
  tag.
- ACR pull failure: confirm the SHA-tagged image exists, the VM's managed
  identity has `AcrPull`, and Terraform's role assignment has propagated.
- Readiness failure: inspect `docker logs sokopulse`. A database timeout
  usually means the VNet peering or private DNS link is missing; an
  authentication error means the password differs from `terraform.tfvars`.
- The image archive and Terraform state stay local. Do not commit them or
  private keys.
- After filming the demo, inspect a Terraform destroy plan and destroy the
  Azure resources to stop ongoing charges. This removes the VMs and the managed
  database with its data.
