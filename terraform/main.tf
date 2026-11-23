# resource group for everything
resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-rg"
  location = var.location
}

# The Summative network is isolated from the existing Formative 3 network.
module "network" {
  source              = "./modules/network"
  project_name        = var.project_name
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  admin_source_cidr   = var.admin_source_cidr
}

module "database" {
  source                  = "./modules/database"
  project_name            = var.project_name
  location                = var.database_location
  resource_group_name     = azurerm_resource_group.main.name
  server_name             = var.database_server_name
  app_vnet_id             = module.network.vnet_id
  app_vnet_name           = module.network.vnet_name
  app_subnet_cidr         = module.network.app_subnet_cidr
  database_admin_username = var.database_admin_username
  database_admin_password = var.database_admin_password
}

resource "azurerm_container_registry" "main" {
  name                          = var.container_registry_name
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  sku                           = "Basic"
  admin_enabled                 = false
  public_network_access_enabled = true
}

resource "azurerm_public_ip" "jumpbox" {
  name                = "${var.project_name}-jumpbox-ip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "jumpbox" {
  name                = "${var.project_name}-jumpbox-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = module.network.jumpbox_subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.jumpbox.id
  }
}

resource "azurerm_linux_virtual_machine" "jumpbox" {
  name                            = "${var.project_name}-jumpbox"
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  size                            = var.vm_size
  admin_username                  = var.admin_username
  network_interface_ids           = [azurerm_network_interface.jumpbox.id]
  disable_password_authentication = true

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.admin_ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}

resource "azurerm_public_ip" "load_balancer" {
  name                = "${var.project_name}-app-lb-ip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_lb" "app" {
  name                = "${var.project_name}-app-lb"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"

  frontend_ip_configuration {
    name                 = "public"
    public_ip_address_id = azurerm_public_ip.load_balancer.id
  }
}

resource "azurerm_lb_backend_address_pool" "app" {
  name            = "app-pool"
  loadbalancer_id = azurerm_lb.app.id
}

resource "azurerm_lb_probe" "app" {
  name            = "app-readiness"
  loadbalancer_id = azurerm_lb.app.id
  protocol        = "Http"
  port            = 3000
  request_path    = "/api/ready"
}

resource "azurerm_lb_rule" "app" {
  name                           = "http-to-app"
  loadbalancer_id                = azurerm_lb.app.id
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 3000
  frontend_ip_configuration_name = "public"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.app.id]
  probe_id                       = azurerm_lb_probe.app.id
  disable_outbound_snat          = true
}

resource "azurerm_lb_outbound_rule" "app" {
  name                     = "app-outbound"
  loadbalancer_id          = azurerm_lb.app.id
  protocol                 = "All"
  backend_address_pool_id  = azurerm_lb_backend_address_pool.app.id
  allocated_outbound_ports = 1024
  tcp_reset_enabled        = true
  idle_timeout_in_minutes  = 4

  frontend_ip_configuration {
    name = "public"
  }
}

resource "azurerm_network_interface" "app" {
  name                = "${var.project_name}-app-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = module.network.app_subnet_id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_network_interface_backend_address_pool_association" "app" {
  network_interface_id    = azurerm_network_interface.app.id
  ip_configuration_name   = "internal"
  backend_address_pool_id = azurerm_lb_backend_address_pool.app.id
}

resource "azurerm_linux_virtual_machine" "app" {
  name                            = "${var.project_name}-app"
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  size                            = var.vm_size
  admin_username                  = var.admin_username
  network_interface_ids           = [azurerm_network_interface.app.id]
  disable_password_authentication = true

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.admin_ssh_public_key
  }

  identity {
    type = "SystemAssigned"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}

resource "azurerm_role_assignment" "app_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_virtual_machine.app.identity[0].principal_id
}
