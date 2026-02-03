#!/bin/bash

# Apply agent levels migration to Supabase

echo "🔧 Applying agent levels migration..."

# Read Supabase connection details from .env.local
source .env.local

# Run the migration
psql "$NEXT_PUBLIC_SUPABASE_URL" < sql/003_agent_levels.sql

echo "✅ Migration applied successfully!"
