# Ansible deployment

This configures the Ubuntu VM from Terraform and runs SokoPulse in Docker.
There are three roles: `docker` installs Docker, `security` sets up UFW and
key-only SSH, and `application` loads the image and checks the API.

## Before starting

- Apply Terraform first (see [the Terraform guide](../terraform/README.md)).
- Install Ansible on your laptop. These playbooks use Ansible core 2.19 or newer.
- Have Terraform, Docker with Buildx, and your SSH private key available locally.
- Make sure `admin_source_cidr` in Terraform matches the network your SSH
  connection actually uses. A VPN can make this different from your browser IP.

Run these commands from the repository root:

```bash
ansible-galaxy collection install -r ansible/requirements.yml
terraform -chdir=terraform apply
ansible-inventory -i ansible/inventory.sh --graph
```

`inventory.sh` reads the current IP, username and admin CIDR from Terraform's
`ansible_inventory` output. It does not need Azure credentials or a saved list
of IPs. Terraform must already have been applied with that output.
The inventory fails if Terraform cannot supply it.

If you prefer a static inventory, copy `ansible/inventory.example.yml` to
`ansible/inventory.local.yml`, replace the example values, and use that path
instead. The local file is ignored by Git.

## Build and deploy

Build for the Azure VM's amd64 CPU, even if your laptop uses Apple Silicon:

```bash
docker build --platform linux/amd64 -t sokopulse:f3 .
docker save -o sokopulse-image.tar sokopulse:f3
```

Connect once and check the host fingerprint before accepting it:

```bash
ssh azureuser@YOUR_VM_IP
exit
```

Use the username you set in Terraform if it is not `azureuser`.
Do not disable SSH host-key checking. If SSH uses a different key from your
default one, add `--private-key ~/.ssh/YOUR_KEY` to the Ansible commands.

```bash
ansible-playbook -i ansible/inventory.sh ansible/playbook.yml --syntax-check
ansible-playbook -i ansible/inventory.sh ansible/playbook.yml
# run it again to check that nothing needs changing
ansible-playbook -i ansible/inventory.sh ansible/playbook.yml
ansible-playbook -i ansible/inventory.sh ansible/verify.yml
curl --fail "http://$(terraform -chdir=terraform output -raw public_ip_address)/api/health"
```

The second run should report `changed=0` when the image and settings are the
same. To deploy another version, build and save a new image. You can override
the defaults with `-e app_image=sokopulse:YOUR_TAG -e app_archive=/path/image.tar`.
The archive must contain that exact image tag. There is no registry to log in to.

`verify.yml` checks the running container, effective SSH settings, firewall,
and public API access from your laptop. It only reads settings.

## What gets configured

- Docker starts at boot and the container uses `unless-stopped`.
- The app still runs as the non-root `node` user, with a read-only filesystem,
  no Linux capabilities, and bounded Docker logs.
- UFW allows HTTP and SSH from the same admin CIDR used by Terraform.
  SSH access is allowed before UFW is enabled.
- SSH password/root login and X11 forwarding are disabled. The config is
  checked before reload, then Ansible reconnects to check access.
- The health endpoint is retried after deployment. If it fails, Ansible prints
  the container logs and fails instead of claiming the deployment worked.

Docker-published ports can bypass UFW. The Azure NSG is still needed and only
allows ports 80 and source-restricted 22 from outside. Do not publish extra
ports without updating both layers deliberately.

This is a plain HTTP demo with seeded data, not a real payment system.
In-memory trades are lost when the container is replaced or restarted.
Do not enter real payment details.

## Troubleshooting and cleanup

- SSH timeout: check the VM is running, your source CIDR and the NSG.
  Do not open SSH to the whole internet to fix it.
- If changing admin networks, update Terraform first. UFW rules from an old
  CIDR remain until you remove them with `sudo ufw delete allow from OLD_CIDR
  to any port 22 proto tcp`, after checking a new SSH session works.
- Missing image: rerun `docker save` and check `app_image` matches its tag.
- Health failure: check `sudo docker logs sokopulse` and `sudo docker inspect
  sokopulse`. Fix the error and rerun the playbook.
- The archive and Terraform state stay local. Do not commit them or private keys.
- When finished, use `terraform -chdir=terraform destroy` to avoid ongoing costs.
  This deletes the VM and its data; only do it when the team is done testing.
