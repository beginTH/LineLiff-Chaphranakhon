# Production Handoff

Use only the six workflow files in `outputs/modular/`. The V15 monolith in `outputs/archive/v15-monolith/` is for rollback only.

## Import checklist

1. Export an n8n backup.
2. Import all six modular JSON files.
3. Reconnect Google Sheets, Drive, and LINE credentials.
4. Check spreadsheet IDs, template IDs, folders, and `Allowed Origins`.
5. Disable older workflows with duplicate webhook paths.
6. Publish the modular workflows.
7. Test the business sequence and edge cases.

Known limits: direct order rejection, atomic approval locking, and CSV/email accounting are not implemented.
