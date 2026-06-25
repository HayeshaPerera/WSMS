const fs = require('fs');
const path = require('path');

const dir = 'd:/WSMS/frontend/src/app';

const replacements = [
  { regex: /Colombo Warehouse/gi, replacement: 'SL Warehouse' },
  { regex: /Central Warehouse/gi, replacement: 'SL Warehouse' },
  { regex: /North Distribution Center/gi, replacement: 'SL Warehouse' },
  { regex: /Colombo Supermarket/gi, replacement: 'SL Supermarket' },
  { regex: /Uptown Plaza/gi, replacement: 'SL Supermarket' },
  { regex: /Suburban Store/gi, replacement: 'SL Supermarket' },
  { regex: /MegaMart Downtown/gi, replacement: 'SL Supermarket' },
  { regex: /MegaMart North/gi, replacement: 'SL Supermarket' },
  { regex: /MegaMart East/gi, replacement: 'SL Supermarket' },
  { regex: /MegaMart West/gi, replacement: 'SL Supermarket' },
  { regex: /MegaMart South/gi, replacement: 'SL Supermarket' },
  { regex: /Fresh Mart - Colombo/gi, replacement: 'SL Supermarket' },
  { regex: /Fresh Mart - Kandy/gi, replacement: 'SL Supermarket' },
  { regex: /Fresh Mart - Galle/gi, replacement: 'SL Supermarket' },
  { regex: /Metro Store - Colombo/gi, replacement: 'SL Supermarket' },
  { regex: /Fresh Mart/gi, replacement: 'SL Supermarket' },
  { regex: /Metro Store/gi, replacement: 'SL Supermarket' },
  { regex: /Supermarket 1/gi, replacement: 'SL Supermarket' }
];

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const rule of replacements) {
        if (rule.regex.test(content)) {
          content = content.replace(rule.regex, rule.replacement);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      }
    }
  }
}

processDir(dir);
