app_name = "uichange"
app_title = "uichange"
app_publisher = "prathamesh walvekar"
app_description = "uichange"
app_email = "walvekarprathamesh734@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "uichange",
# 		"logo": "/assets/uichange/logo.png",
# 		"title": "uichange",
# 		"route": "/uichange",
# 		"has_permission": "uichange.api.permission.has_app_permission"
# 	}
# ]

# Include in <head>
# ------------------

# Include modern theme CSS and JS globally
# app_include_css = [
#     "/assets/uichange/css/modern-theme.css",
#     "/assets/uichange/css/modern-list-view.css",
#     "/assets/uichange/css/emergency-fix.css"
# ]
# app_include_js = [
#     "/assets/uichange/js/modern-ui.js"
# ]
# web_include_css = "/assets/uichange/css/modern-sidebar.css"

# include js, css files in header of desk.html
# app_include_css = "/assets/uichange/css/uichange.css"
# app_include_js = "/assets/uichange/js/uichange.js"
# app_include_css = [
#     "/assets/uichange/css/restro.css"
# ]
# include js, css files in header of web template
# web_include_css = "/assets/uichange/css/uichange.css"
# web_include_js = "/assets/uichange/js/uichange.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "uichange/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "uichange/public/icons.svg"

# Home Pages
# ----------

# Override the default login page with our modern version
# home_page = "uichange.pages.dash"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "uichange.utils.jinja_methods",
# 	"filters": "uichange.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "uichange.install.before_install"
# after_install = "uichange.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "uichange.uninstall.before_uninstall"
# after_uninstall = "uichange.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "uichange.utils.before_app_install"
# after_app_install = "uichange.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "uichange.utils.before_app_uninstall"
# after_app_uninstall = "uichange.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "uichange.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

scheduler_events = {
	# "all": [
	# 	"uichange.tasks.all"
	# ],
	# "daily": [
	# 	"uichange.tasks.daily"
	# ],
	# "hourly": [
	# 	"uichange.tasks.hourly"
	# ],
	# "weekly": [
	# 	"uichange.tasks.weekly"
	# ],
	"monthly": [
		"uichange.tasks.replace_workspace_with_modern_ui"
	],
}

# Testing
# -------

# before_tests = "uichange.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "uichange.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "uichange.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["uichange.utils.before_request"]
# after_request = ["uichange.utils.after_request"]

# Job Events
# ----------
# before_job = ["uichange.utils.before_job"]
# after_job = ["uichange.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"uichange.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

