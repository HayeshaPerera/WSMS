const fs = require('fs');
const path = require('path');

const directory = 'd:/WSMS/frontend/src/app';

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/Sathosa Main Branch/g, 'Colombo Supermarket');
    content = content.replace(/Kelaniya Main Warehouse/g, 'Colombo Warehouse');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated:', filePath);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.html')) {
            replaceInFile(fullPath);
        }
    }
}

walkDir(directory);
