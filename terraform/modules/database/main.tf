resource "azurerm_private_dns_zone" "postgres" {
  name                = "${var.project_name}.postgres.database.azure.com"
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.project_name}-postgres-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = var.server_name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  administrator_login           = var.database_admin_username
  administrator_password        = var.database_admin_password
  sku_name                      = "B_Standard_B1ms"
  version                       = "16"
  storage_mb                    = 32768
  delegated_subnet_id           = var.database_subnet_id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "sokopulse"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}
