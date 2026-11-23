output "host" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.main.name
}

output "admin_username" {
  value = azurerm_postgresql_flexible_server.main.administrator_login
}
