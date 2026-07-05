import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('src/data/collections/cosmos.ts', 'utf-8');
const productRegex = /"id":\s*"([^"]+)"[\s\S]*?"description":\s*"([^"]+)"/g;

let match;
while ((match = productRegex.exec(content)) !== null) {
  console.log("Found ID:", match[1], "Current Desc:", match[2]);
}
