#!/bin/bash
# Apply SQL migrations to Supabase database
# Usage: ./scripts/apply-migrations.sh

echo "🔧 Applying database migrations..."

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DB_URL environment variable not set"
  echo "   Set it with: export SUPABASE_DB_URL='postgresql://...'"
  exit 1
fi

# Apply migrations
for sql_file in sql/*.sql; do
  if [ -f "$sql_file" ]; then
    echo "📄 Applying: $sql_file"
    psql "$SUPABASE_DB_URL" -f "$sql_file"
    
    if [ $? -eq 0 ]; then
      echo "✅ Success: $sql_file"
    else
      echo "❌ Failed: $sql_file"
      exit 1
    fi
  fi
done

echo "🎉 All migrations applied successfully!"
