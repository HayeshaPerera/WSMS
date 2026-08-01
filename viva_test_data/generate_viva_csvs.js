const fs = require('fs');
const path = require('path');

const prices = {
    'PROD001': 1490.00, 'PROD002': 750.00, 'PROD003': 3890.00,
    'PROD004': 1790.00, 'PROD005': 2100.00, 'PROD006': 1180.00,
    'PROD007': 2690.00, 'PROD008': 1650.00, 'PROD009': 890.00
};

function generateCsv(filename, trendType, skus) {
    let content = "Product SKU,Sale Date,Quantity Sold,Unit Price,Notes\n";
    let baseDate = new Date('2026-06-01'); // Start from June
    
    for (let day = 0; day < 30; day++) {
        let currentDate = new Date(baseDate);
        currentDate.setDate(currentDate.getDate() + day);
        let dateStr = currentDate.toISOString().split('T')[0];
        
        for (let sku of skus) {
            let qty = 20; // base qty
            
            if (trendType === 'increasing') {
                qty = Math.round(10 + (day * 4) + (Math.random() * 8)); // clear upward slope
            } else if (trendType === 'decreasing') {
                qty = Math.round(150 - (day * 4) + (Math.random() * 8)); // clear downward slope
                if (qty < 0) qty = 0;
            } else if (trendType === 'seasonal') {
                let dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    qty = Math.round(100 + (Math.random() * 20)); // Weekend spike
                } else {
                    qty = Math.round(15 + (Math.random() * 5)); // Weekday lull
                }
            }
            
            content += `${sku},${dateStr},${qty},${prices[sku]},"Clear ${trendType} trend"\n`;
        }
    }
    
    fs.writeFileSync(path.join(__dirname, filename), content);
    console.log(`Generated ${filename}`);
}

// Assign DIFFERENT SKUs to each file so they don't cancel each other out
generateCsv('viva_test_increasing.csv', 'increasing', ['PROD001', 'PROD002', 'PROD003']);
generateCsv('viva_test_decreasing.csv', 'decreasing', ['PROD004', 'PROD005', 'PROD006']);
generateCsv('viva_test_seasonal.csv', 'seasonal', ['PROD007', 'PROD008', 'PROD009']);
