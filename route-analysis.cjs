// Script to analyze menu items and extract URLs with required permissions
const fs = require('fs');

// Read the menu.ts file
const menuContent = fs.readFileSync('src/lib/menu.ts', 'utf8');

// Extract menu items with URLs and permissions
const menuItems = [];
const lines = menuContent.split('\n');

let currentGroup = '';
let inItems = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Detect group title
  if (line.includes('title:') && !inItems) {
    const match = line.match(/title:\s*"([^"]+)"/);
    if (match) {
      currentGroup = match[1];
    }
  }
  
  // Detect items array start
  if (line.includes('items: [')) {
    inItems = true;
    continue;
  }
  
  // Detect items array end
  if (line.includes('],') && inItems) {
    inItems = false;
    continue;
  }
  
  // Extract item details when in items array
  if (inItems) {
    if (line.includes('title:')) {
      let j = i;
      let itemTitle = '';
      let itemUrl = '';
      let itemPermission = '';
      
      // Look for title, url, and permission in the next few lines
      while (j < lines.length && !lines[j].includes('},')) {
        const currentLine = lines[j].trim();
        
        if (currentLine.includes('title:')) {
          const match = currentLine.match(/title:\s*"([^"]+)"/);
          if (match) itemTitle = match[1];
        }
        
        if (currentLine.includes('url:')) {
          const match = currentLine.match(/url:\s*"([^"]+)"/);
          if (match) itemUrl = match[1];
        }
        
        if (currentLine.includes('requiredPermission:')) {
          const match = currentLine.match(/requiredPermission:\s*"([^"]+)"/);
          if (match) itemPermission = match[1];
        }
        
        j++;
      }
      
      if (itemUrl && itemPermission) {
        menuItems.push({
          group: currentGroup,
          title: itemTitle,
          url: itemUrl,
          permission: itemPermission
        });
      }
    }
  }
}

// Output the results
console.log('Routes that need ProtectedRoute protection:');
console.log('='.repeat(60));
menuItems.forEach(item => {
  console.log(`Group: ${item.group}`);
  console.log(`Title: ${item.title}`);
  console.log(`URL: ${item.url}`);
  console.log(`Permission: ${item.permission}`);
  console.log('-'.repeat(40));
});

console.log(`\nTotal routes requiring protection: ${menuItems.length}`);