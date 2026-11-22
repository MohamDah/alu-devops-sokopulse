output "resource_group_name" {
  description = "Name of the resource group that holds the Summative resources."
  value       = azurerm_resource_group.main.name
}

output "app_url" {
  description = "Public HTTP address of the application load balancer."
  value       = "http://${azurerm_public_ip.load_balancer.ip_address}"
}

output "jumpbox_ssh_command" {
  description = "Command to connect to the jumpbox over SSH."
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.jumpbox.ip_address}"
}

output "app_vm_id" {
  description = "Resource ID of the private application virtual machine."
  value       = azurerm_linux_virtual_machine.app.id
}

output "jumpbox_vm_id" {
  description = "Resource ID of the public jumpbox virtual machine."
  value       = azurerm_linux_virtual_machine.jumpbox.id
}

output "summative_vnet_id" {
  description = "Resource ID of the isolated Summative virtual network."
  value       = module.network.vnet_id
}

output "summative_jumpbox_subnet_id" {
  description = "Resource ID of the subnet for the Summative jumpbox."
  value       = module.network.jumpbox_subnet_id
}

output "summative_app_subnet_id" {
  description = "Resource ID of the private Summative app subnet."
  value       = module.network.app_subnet_id
}

output "summative_database_subnet_id" {
  description = "Resource ID of the delegated PostgreSQL subnet."
  value       = module.network.database_subnet_id
}

output "summative_database_host" {
  description = "Private DNS hostname for the Summative PostgreSQL server."
  value       = module.database.host
}

output "summative_database_name" {
  description = "Name of the SokoPulse PostgreSQL database."
  value       = module.database.database_name
}

output "container_registry_login_server" {
  description = "Login server for the authenticated Azure Container Registry."
  value       = azurerm_container_registry.main.login_server
}
