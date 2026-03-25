
- Outlook inbox + send email app built with shared_office365 connector
- Single shared client pattern per connections skill; DATA_SOURCE = 'office365'
- power.config.json updated with office365 connectionReference
- Operations used: GetEmailsV3 (list inbox), SendEmailV2 (send email)
- CSS in separate dist/styles.css; editorial warm-tone design with Playfair Display + DM Sans
- User still needs to: click Sync Connections button, then Deploy to push to environment
