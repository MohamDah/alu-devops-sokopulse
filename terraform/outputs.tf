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

output "database_host" {
  description = "Private DNS hostname of the managed PostgreSQL server."
  value       = module.database.host
}

output "container_registry_login_server" {
  description = "Login server for the authenticated Azure Container Registry."
  value       = azurerm_container_registry.main.login_server
}

output "ansible_inventory" {
  description = "Dynamic Ansible inventory for the private app VM through the jumpbox."
  value = {
    _meta = {
      hostvars = {
        app = {
          ansible_host               = azurerm_network_interface.app.private_ip_address
          ansible_user               = var.admin_username
          ansible_python_interpreter = "/usr/bin/python3"
          ansible_ssh_common_args    = "-o ProxyJump=${var.admin_username}@${azurerm_public_ip.jumpbox.ip_address}"
        }
      }
    }
    sokopulse = {
      hosts = ["app"]
      vars = {
        app_url      = "http://${azurerm_public_ip.load_balancer.ip_address}"
        jumpbox_cidr = module.network.jumpbox_subnet_cidr
        db_host      = module.database.host
        db_name      = module.database.database_name
        db_user      = module.database.admin_username
      }
    }
  }
}
