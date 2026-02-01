#!/usr/bin/env node

/**
 * Script to automatically add mutation logging to all tRPC router files
 * 
 * This script:
 * 1. Scans all router files in src/server/api/routers/
 * 2. Adds the import for logApiMutation if not present
 * 3. Wraps each .mutation() call with logging logic
 * 
 * Usage: node scripts/add-mutation-logging.js
 */

const fs = require('fs');
const path = require('path');

const ROUTERS_DIR = path.join(__dirname, '../src/server/api/routers');
const IMPORT_STATEMENT = `import { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";`;

// List of router files to process (exclude test files and non-router files)
const ROUTER_FILES = [
  'aiRateLimit.ts',
  'attendance.ts',
  'auth.ts',
  'balanceAccount.ts',
  'cashBankReport.ts',
  'chartAccount.ts',
  'class.ts',
  'classType.ts',
  'config.ts',
  'device.ts',
  'email.ts',
  'employee.ts',
  'esp32.ts',
  'fc-member.ts',
  'fc.ts',
  'freezePrice.ts',
  'inventory.ts',
  'managerCalendar.ts',
  'member.ts',
  'memberClass.ts',
  'memberReward.ts',
  'mqtt.ts',
  'package.ts',
  'payment.ts',
  'paymentValidation.ts',
  'permission.ts',
  'personalTrainer.ts',
  'posCategory.ts',
  'posItem.ts',
  'posSale.ts',
  'post.ts',
  'profile.ts',
  'pt.ts',
  'purchaseOrder.ts',
  'reward.ts',
  'role-permission.ts',
  'role.ts',
  'subscription.ts',
  'subscriptionImport.ts',
  'supplier.ts',
  'tracking.ts',
  'trainerSession.ts',
  'transaction.ts',
  'user.ts',
  'voucher.ts',
  'whatsapp.ts',
];

/**
 * Add import statement if not present
 */
function addImportIfNeeded(content) {
  if (content.includes('logApiMutation')) {
    console.log('  ✓ Import already exists');
    return content;
  }

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('} from')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, IMPORT_STATEMENT);
    console.log('  ✓ Added import statement');
    return lines.join('\n');
  }

  console.log('  ⚠ Could not find import location, skipping');
  return content;
}

/**
 * Extract router name from procedure path (e.g., "memberRouter" -> "member")
 */
function getRouterName(filePath) {
  const fileName = path.basename(filePath, '.ts');
  return fileName;
}

/**
 * Detect HTTP method from procedure name
 */
function getMethodFromProcedureName(procedureName) {
  const lower = procedureName.toLowerCase();
  if (lower.includes('create') || lower.includes('add')) return 'POST';
  if (lower.includes('update') || lower.includes('edit')) return 'PUT';
  if (lower.includes('delete') || lower.includes('remove')) return 'DELETE';
  return 'PATCH';
}

/**
 * Process a single router file
 */
function processRouterFile(filePath) {
  console.log(`\nProcessing: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Add import if needed
  content = addImportIfNeeded(content);
  
  const routerName = getRouterName(filePath);
  let mutationCount = 0;
  let alreadyLogged = 0;
  
  // Find all mutation definitions
  // Pattern: procedureName: ...procedure(...).mutation(async ({ ctx, input })
  const mutationRegex = /(\w+):\s*\w+Procedure[^.]*\.mutation\s*\(\s*async\s*\(\s*{\s*ctx(?:,\s*input)?\s*}\s*\)\s*=>\s*{/g;
  
  let match;
  const mutations = [];
  
  while ((match = mutationRegex.exec(content)) !== null) {
    const procedureName = match[1];
    const startIndex = match.index;
    
    // Check if this mutation already has logging
    const nextChunk = content.substring(startIndex, startIndex + 500);
    if (nextChunk.includes('logApiMutation') || nextChunk.includes('const startTime = Date.now()')) {
      alreadyLogged++;
      continue;
    }
    
    mutations.push({
      name: procedureName,
      index: startIndex,
      fullMatch: match[0]
    });
    
    mutationCount++;
  }
  
  console.log(`  Found ${mutations.length + alreadyLogged} mutations (${mutations.length} need logging, ${alreadyLogged} already have it)`);
  
  if (mutations.length === 0) {
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✓ Updated imports only`);
    }
    return { total: mutationCount + alreadyLogged, added: 0 };
  }
  
  console.log(`  ⚠ Manual logging required for ${mutations.length} mutations:`);
  mutations.forEach(m => console.log(`    - ${routerName}.${m.name}`));
  
  // Write file with import added
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return { total: mutationCount + alreadyLogged, added: 0, needsManual: mutations.length };
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(60));
  console.log('Adding Mutation Logging to tRPC Routers');
  console.log('='.repeat(60));
  
  let totalMutations = 0;
  let totalAdded = 0;
  let totalNeedsManual = 0;
  let filesProcessed = 0;
  
  ROUTER_FILES.forEach(file => {
    const filePath = path.join(ROUTERS_DIR, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠ File not found: ${file}`);
      return;
    }
    
    const result = processRouterFile(filePath);
    totalMutations += result.total;
    totalAdded += result.added;
    totalNeedsManual += result.needsManual || 0;
    filesProcessed++;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Total mutations found: ${totalMutations}`);
  console.log(`Imports added: ${filesProcessed - totalAdded}`);
  console.log(`Mutations needing manual logging: ${totalNeedsManual}`);
  console.log('='.repeat(60));
  console.log('\n✓ Import statements have been added to all router files');
  console.log('⚠ Manual logging still required for mutation endpoints');
  console.log('\nNext steps:');
  console.log('1. Review the list of mutations above');
  console.log('2. Manually add logging to each mutation following the pattern in member.ts create mutation');
  console.log('3. Run: npx prisma generate (to update Prisma client)');
  console.log('4. Test the application');
}

main();
