output "public_ip_address" {
  description = "Public IP address of the VM."
  value       = azurerm_public_ip.main.ip_address
}

output "app_url" {
  description = "Address of the application once it is deployed (plain HTTP)."
  value       = "http://${azurerm_public_ip.main.ip_address}"
}

output "ssh_command" {
  description = "Command to connect to the VM over SSH."
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}

output "resource_group_name" {
  description = "Name of the resource group that holds everything."
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "Resource ID of the resource group."
  value       = azurerm_resource_group.main.id
}

output "virtual_network_id" {
  description = "Resource ID of the virtual network."
  value       = azurerm_virtual_network.main.id
}

output "subnet_id" {
  description = "Resource ID of the subnet."
  value       = azurerm_subnet.main.id
}

output "network_security_group_id" {
  description = "Resource ID of the network security group."
  value       = azurerm_network_security_group.main.id
}

output "public_ip_id" {
  description = "Resource ID of the public IP address."
  value       = azurerm_public_ip.main.id
}

output "vm_id" {
  description = "Resource ID of the virtual machine."
  value       = azurerm_linux_virtual_machine.main.id
}
