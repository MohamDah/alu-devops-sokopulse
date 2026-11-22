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

variable "database_admin_username" {
  type        = string
  description = "Administrator login for the Summative PostgreSQL server."
}

variable "database_admin_password" {
  type        = string
  description = "Administrator password for the Summative PostgreSQL server."
  sensitive   = true

  validation {
    condition     = length(var.database_admin_password) >= 8
    error_message = "The PostgreSQL administrator password must contain at least 8 characters."
  }
}

variable "database_server_name" {
  type        = string
  description = "Globally unique lowercase name for the PostgreSQL Flexible Server."

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.database_server_name))
    error_message = "Use a 3-63 character PostgreSQL server name with lowercase letters, numbers, and hyphens."
  }
}

variable "container_registry_name" {
  type        = string
  description = "Globally unique alphanumeric name for the Azure Container Registry."

  validation {
    condition     = can(regex("^[a-z0-9]{5,50}$", var.container_registry_name))
    error_message = "The Azure Container Registry name must be 5-50 lowercase alphanumeric characters."
  }
}
