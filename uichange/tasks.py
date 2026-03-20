import frappe
import shutil
import os
from frappe.utils import now

def replace_workspace_with_modern_ui():
    """
    Monthly cron job to replace Frappe workspace.js with modern-ui.js
    This task will copy the modern UI file to replace the default workspace file
    """
    try:
        # Source file (modern UI)
        source_path = os.path.join(frappe.get_app_path('uichange'), 'public', 'js', 'modern-ui.js')
        
        # Target file (Frappe workspace)
        target_path = os.path.join(frappe.get_app_path('frappe'), 'public', 'js', 'frappe', 'views', 'workspace', 'workspace.js')
        
        # Create backup of original file before replacing
        from datetime import datetime
        backup_path = target_path + '.backup.' + datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if os.path.exists(target_path):
            shutil.copy2(target_path, backup_path)
            frappe.logger().info(f"Created backup of workspace.js at: {backup_path}")
        
        # Copy modern-ui.js to workspace.js location
        shutil.copy2(source_path, target_path)
        
        frappe.logger().info(f"Successfully replaced workspace.js with modern-ui.js")
        frappe.db.commit()
        
        return {
            "status": "success",
            "message": f"Workspace.js replaced with modern UI. Backup created at: {backup_path}",
            "timestamp": now()
        }
        
    except Exception as e:
        frappe.logger().error(f"Failed to replace workspace.js: {str(e)}")
        frappe.db.rollback()
        return {
            "status": "error",
            "message": f"Failed to replace workspace.js: {str(e)}",
            "timestamp": now()
        }

def restore_original_workspace():
    """
    Utility function to restore the original workspace.js from the latest backup
    """
    try:
        target_path = os.path.join(frappe.get_app_path('frappe'), 'public', 'js', 'frappe', 'views', 'workspace', 'workspace.js')
        
        # Find the latest backup file
        backup_dir = os.path.dirname(target_path)
        backup_files = [f for f in os.listdir(backup_dir) if f.startswith('workspace.js.backup.')]
        
        if not backup_files:
            return {
                "status": "error",
                "message": "No backup files found",
                "timestamp": now()
            }
        
        # Sort backup files and get the latest
        backup_files.sort(reverse=True)
        latest_backup = os.path.join(backup_dir, backup_files[0])
        
        # Restore from backup
        shutil.copy2(latest_backup, target_path)
        
        frappe.logger().info(f"Restored workspace.js from backup: {latest_backup}")
        frappe.db.commit()
        
        return {
            "status": "success",
            "message": f"Restored workspace.js from backup: {latest_backup}",
            "timestamp": now()
        }
        
    except Exception as e:
        frappe.logger().error(f"Failed to restore workspace.js: {str(e)}")
        frappe.db.rollback()
        return {
            "status": "error",
            "message": f"Failed to restore workspace.js: {str(e)}",
            "timestamp": now()
        }
