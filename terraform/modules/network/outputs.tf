output "vnet_id" {
  value = azurerm_virtual_network.summative.id
}

output "jumpbox_subnet_id" {
  value = azurerm_subnet.jumpbox.id
}

output "app_subnet_id" {
  value = azurerm_subnet.app.id
}

output "database_subnet_id" {
  value = azurerm_subnet.database.id
}

output "app_nsg_id" {
  value = azurerm_network_security_group.app.id
}
