$csvFiles = Get-ChildItem -Path D:\WSMS -Filter *.csv
foreach ($file in $csvFiles) {
    $content = Get-Content $file.FullName
    $content = $content -replace 'PROD001', 'SKU-001-RICE'
    $content = $content -replace 'PROD002', 'SKU-002-OIL'
    $content = $content -replace 'PROD003', 'SKU-003-CHICKEN'
    $content = $content -replace 'PROD004', 'SKU-004-TOMATO'
    $content = $content -replace 'PROD005', 'SKU-005-MILK'
    $content = $content -replace 'PROD006', 'SKU-006-BREAD'
    $content = $content -replace 'PROD007', 'SKU-007-BANANA'
    $content = $content -replace 'PROD008', 'SKU-008-ORANGE'
    
    $content = $content -replace 'PROD009', 'SKU-001-RICE'
    $content = $content -replace 'PROD010', 'SKU-002-OIL'
    $content = $content -replace 'PROD011', 'SKU-003-CHICKEN'
    $content = $content -replace 'PROD012', 'SKU-004-TOMATO'
    $content = $content -replace 'PROD013', 'SKU-005-MILK'
    $content = $content -replace 'PROD014', 'SKU-006-BREAD'
    $content = $content -replace 'PROD015', 'SKU-007-BANANA'
    
    Set-Content -Path $file.FullName -Value $content
}
