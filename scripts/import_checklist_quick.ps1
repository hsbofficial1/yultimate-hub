# Quick PowerShell script to import checklist items
# Run this instead of the Python command if you need to pass credentials

# IMPORTANT: Replace these with your actual values
$SUPABASE_URL = "https://glktlcjpcepphphgaqrc.supabase.co"
$SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY_HERE"  # Get from Supabase Dashboard → Settings → API
$TOURNAMENT_ID = "b696c04b-ac49-4763-9ccd-1460b236f9ac"  # Your tournament ID

# Run the import script with credentials
python scripts/import_checklist_items.py `
  --csv "scripts/tournament_checklist_template.csv" `
  --tournament-id $TOURNAMENT_ID `
  --supabase-url $SUPABASE_URL `
  --supabase-key $SERVICE_ROLE_KEY

Write-Host "`nDone! Check the output above for results."
Read-Host "Press Enter to exit"




