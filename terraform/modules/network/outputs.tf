output "vnet_id" {
  value = azurerm_virtual_network.summative.id
}

output "vnet_name" {
  value = azurerm_virtual_network.summative.name
}

output "app_subnet_cidr" {
  value = azurerm_subnet.app.address_prefixes[0]
}

output "jumpbox_subnet_id" {
  value = azurerm_subnet.jumpbox.id
}

output "jumpbox_subnet_cidr" {
  value = azurerm_subnet.jumpbox.address_prefixes[0]
}

output "app_subnet_id" {
  value = azurerm_subnet.app.id
}

output "app_nsg_id" {
  value = azurerm_network_security_group.app.id
}
