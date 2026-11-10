variable "project_name" {
  type        = string
  description = "Prefix used to name the Azure resources."
  default     = "sokopulse"
}

variable "location" {
  type        = string
  description = "Azure region for all resources. It must be allowed by your subscription policy."
  default     = "southafricanorth"
}

variable "vm_size" {
  type        = string
  description = "Azure VM size. Availability depends on the region and your subscription."
  default     = "Standard_B2ats_v2"
}

variable "admin_username" {
  type        = string
  description = "Name of the Linux admin account on the VM."
  default     = "azureuser"
}

variable "admin_ssh_public_key" {
  type        = string
  description = "Contents of your SSH PUBLIC key (the .pub file). Never use a private key."

  validation {
    condition     = can(regex("^ssh-(rsa|ed25519) ", var.admin_ssh_public_key))
    error_message = "Use an SSH public key that starts with ssh-rsa or ssh-ed25519. Do not paste a private key."
  }
}

variable "admin_source_cidr" {
  type        = string
  description = "Address allowed to connect over SSH, in CIDR form, for example 203.0.113.10/32."

  validation {
    condition     = can(cidrnetmask(var.admin_source_cidr)) && var.admin_source_cidr != "0.0.0.0/0"
    error_message = "Use an IPv4 address in CIDR notation such as 203.0.113.10/32. Opening SSH to 0.0.0.0/0 is not allowed."
  }
}
