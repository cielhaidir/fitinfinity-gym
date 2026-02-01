#!/usr/bin/env node

/**
 * Script to convert all blocking logApiMutation calls to fire-and-forget logApiMutationAsync
 *
 * This script:
 * 1. Finds all files that import logApiMutation
 * 2. Updates imports to use logApiMutationAsync
 * 3. Removes 'await' from logApiMutation calls
 * 4. Renames logApiMutation to logApiMutationAsync
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const DRY_RUN = process.argv.includes('--dry-run');

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  callsUpdated: 0,
};

/**
 * Check if file imports logApiMutation
 */
function importsLogApiMutation(content) {
  return content.includes('logApiMutation') && 
         (content.includes('from "@/server/utils/mutationLogger"') || 
          content.includes("from '@/server/utils/mutationLogger'"));
}

/**
 * Update imports to include logApiMutationAsync
 */
function updateImports(content) {
  let modified = false;
  
  // Pattern 1: import { logApiMutation, ... } from "@/server/utils/mutationLogger";
  const importPattern1 = /import\s*{([^}]+)}\s*from\s*["']@\/server\/utils\/mutationLogger["'];?/g;
  
  content = content.replace(importPattern1, (match, imports) => {
    // Check if logApiMutation is imported but not logApiMutationAsync
    if (imports.includes('logApiMutation') && !imports.includes('logApiMutationAsync')) {
      modified = true;
      // Replace logApiMutation with logApiMutationAsync in the imports
      const updatedImports = imports.replace(/\blogApiMutation\b/g, 'logApiMutationAsync');
      return `import {${updatedImports}} from "@/server/utils/mutationLogger";`;
    }
    return match;
  });

  return { content, modified };
}

/**
 * Remove await from logApiMutation calls and rename to logApiMutationAsync
 */
function updateLogCalls(content) {
  let callsUpdated = 0;
  
  // Pattern: await logApiMutation({
  // Replace with: logApiMutationAsync({
  const awaitPattern = /await\s+logApiMutation\s*\(/g;
  const matches = content.match(awaitPattern);
  
  if (matches) {
    callsUpdated = matches.length;
    content = content.replace(awaitPattern, 'logApiMutationAsync(');
  }
  
  return { content, callsUpdated };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesScanned++;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file imports logApiMutation
  if (!importsLogApiMutation(content)) {
    return;
  }
  
  let modifiedContent = content;
  let fileModified = false;
  
  // Update imports
  const importResult = updateImports(modifiedContent);
  modifiedContent = importResult.content;
  if (importResult.modified) {
    fileModified = true;
    stats.importsUpdated++;
  }
  
  // Update log calls
  const callResult = updateLogCalls(modifiedContent);
  modifiedContent = callResult.content;
  if (callResult.callsUpdated > 0) {
    fileModified = true;
    stats.callsUpdated += callResult.callsUpdated;
  }
  
  if (fileModified) {
    stats.filesModified++;
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would modify: ${relativePath}`);
      console.log(`  - Calls updated: ${callResult.callsUpdated}`);
    } else {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✓ Modified: ${relativePath}`);
      console.log(`  - Calls updated: ${callResult.callsUpdated}`);
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Converting logApiMutation to logApiMutationAsync (fire-and-forget)\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }
  
  // Find all TypeScript files in src/server/api/routers
  const routerFiles = glob.sync('src/server/api/routers/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
    absolute: true,
  });
  
  console.log(`Found ${routerFiles.length} router files to scan\n`);
  
  // Process each file
  for (const file of routerFiles) {
    processFile(file);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log(`Files scanned:       ${stats.filesScanned}`);
  console.log(`Files modified:      ${stats.filesModified}`);
  console.log(`Imports updated:     ${stats.importsUpdated}`);
  console.log(`Calls updated:       ${stats.callsUpdated}`);
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else if (stats.filesModified > 0) {
    console.log('\n✅ All files updated successfully!');
  } else {
    console.log('\n✨ No files needed updating');
  }
}

// Run the script
try {
  main();
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
