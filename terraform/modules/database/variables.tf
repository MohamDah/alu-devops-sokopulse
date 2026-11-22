variable "project_name" {
  type = string
}

variable "server_name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "vnet_id" {
  type = string
}

variable "database_subnet_id" {
  type = string
}

variable "database_admin_username" {
  type = string
}

variable "database_admin_password" {
  type      = string
  sensitive = true
}
