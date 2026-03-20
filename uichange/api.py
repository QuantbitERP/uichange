import frappe
from .tasks import replace_workspace_with_modern_ui, restore_original_workspace

@frappe.whitelist()
def execute_workspace_replacement():
    """
    API endpoint to manually trigger the workspace replacement
    Can be called from the UI or via HTTP request
    """
    return replace_workspace_with_modern_ui()

@frappe.whitelist()
def execute_workspace_restore():
    """
    API endpoint to manually restore the original workspace
    Can be called from the UI or via HTTP request
    """
    return restore_original_workspace()

@frappe.whitelist()
def get_replacement_status():
    """
    Check if modern UI is currently active
    """
    import os
    import hashlib
    
    try:
        # Get paths
        modern_ui_path = os.path.join(frappe.get_app_path('uichange'), 'public', 'js', 'modern-ui.js')
        workspace_path = os.path.join(frappe.get_app_path('frappe'), 'public', 'js', 'frappe', 'views', 'workspace', 'workspace.js')
        
        # Read files and compare hashes
        with open(modern_ui_path, 'rb') as f:
            modern_ui_hash = hashlib.md5(f.read()).hexdigest()
        
        with open(workspace_path, 'rb') as f:
            workspace_hash = hashlib.md5(f.read()).hexdigest()
        
        return {
            "status": "success",
            "modern_ui_active": modern_ui_hash == workspace_hash,
            "modern_ui_hash": modern_ui_hash,
            "workspace_hash": workspace_hash
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
