# Database Migration Scripts

This directory contains scripts for database operations and migrations.

## migrate-old-data.ts

Migrates data from a legacy Replit database to the current database.

### Features

- **Schema Mapping**: Automatically handles column name differences between old and new schemas
- **Data Sanitization**: Cleans up invalid JSON data and other malformed values
- **Auto-generation**: Creates missing required fields (e.g., invoice numbers)
- **Foreign Key Handling**: Migrates tables in correct dependency order
- **Idempotent**: Uses `ON CONFLICT DO NOTHING` to safely re-run migrations

### Usage

1. Set the `OLD_DATABASE_URL` environment variable:
   ```bash
   export OLD_DATABASE_URL="postgresql://user:password@host/database"
   ```

2. Run the migration:
   ```bash
   cd backend
   npx ts-node scripts/migrate-old-data.ts
   ```

### Schema Mappings

The script handles these schema differences:

#### Invoices Table
- `issue_date` → `issued_date`
- `amount_minor` → `total_amount`
- Auto-generates `invoice_number` in format: `INV-YYYYMMDD-####`
- Skips: `advertiser_org_id`, `external_reference`

### Known Issues

- **Creative Approvals**: Some legacy records have invalid JSON in the `documents` field. These are automatically set to `null`.
- **Migration Order**: Tables are migrated in this order to respect foreign keys:
  1. organisations
  2. regions
  3. users
  4. screens
  5. campaigns
  6. creatives
  7. bookings
  8. creative_approvals
  9. flights
  10. invoices

## inspect-old-db.ts

Inspects a database to view its schema and sample data.

### Usage

```bash
cd backend
npx ts-node scripts/inspect-old-db.ts
```

This will show:
- All tables in the database
- Column names and types
- Record counts
- Sample data (for tables with ≤5 records)
