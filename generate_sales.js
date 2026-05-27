const fs = require('fs');

const products = [
  { id: 2, sku: 'PROD002', price: 1.50 },
  { id: 3, sku: 'PROD003', price: 5.00 },
  { id: 4, sku: 'PROD004', price: 4.00 },
  { id: 5, sku: 'PROD005', price: 6.50 },
  { id: 6, sku: 'PROD006', price: 2.00 }
];

let sql = 'INSERT INTO sales_history (product_id, supermarket_id, sale_date, quantity_sold, unit_price, total_amount, created_at, is_deleted) VALUES\n';
let csv = 'product_sku,sale_date,quantity_sold,unit_price,total_amount\n';

let values = [];
const today = new Date();

for (let i = 0; i < 30; i++) {
  const date = new Date(today);
  date.setDate(date.getDate() - (30 - i));
  const dateString = date.toISOString().split('T')[0];
  
  for (const product of products) {
    const qty = Math.floor(Math.random() * 20) + 5; 
    const total = qty * product.price;
    values.push(`(${product.id}, 1, '${dateString}', ${qty}, ${product.price}, ${total}, NOW(), false)`);
    csv += `${product.sku},${dateString},${qty},${product.price},${total}\n`;
  }
}

sql += values.join(',\n') + ';';

fs.writeFileSync('insert_sales.sql', sql);
fs.writeFileSync('sales_data.csv', csv);
console.log('Generated insert_sales.sql and sales_data.csv');
