# This script connects to the PostgreSQL Docker container and truncates the sales_history table.
# Run this between CSV uploads during your Viva to clear the data so the charts look clean!

Write-Host "Resetting Sales History data..." -ForegroundColor Yellow

# Execute the TRUNCATE command inside the running postgres container
docker exec wsscms-postgres psql -U wsscms_user -d wsscms_db -c "TRUNCATE TABLE sales_history RESTART IDENTITY CASCADE;"

Write-Host "Sales History has been cleared successfully!" -ForegroundColor Green
Write-Host "You can now upload a fresh CSV file and click 'Run AI Forecast'!" -ForegroundColor Green
