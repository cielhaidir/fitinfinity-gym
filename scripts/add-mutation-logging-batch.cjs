#!/usr/bin/env node

/**
 * Batch Mutation Logging Script
 * 
 * This script adds mutation logging to router files systematically.
 * It identifies mutation endpoints and wraps them with the logging pattern.
 */

const fs = require('fs');
const path = require('path');

// List of router files to process (in priority order)
const priorityRouters = [
  'subscription.ts',
  'payment.ts',
  'transaction.ts',
  'finance.ts',
  'package.ts',
  'attendance.ts',
  'class.ts',
  'employee.ts',
  'inventory.ts',
  'posSale.ts',
  'purchaseOrder.ts',
  'reward.ts',
  'role.ts',
  'voucher.ts',
];

const routersDir = path.join(__dirname, '../src/server/api/routers');

// Check if a file already has logging imports
function hasLoggingImport(content) {
  return content.includes('logApiMutation');
}

// Add logging import to a file
function addLoggingImport(content) {
  // Find the last import statement
  const importRegex = /^import\s+.*?;$/gm;
  const imports = content.match(importRegex);
  
  if (!imports || imports.length === 0) {
    console.log('No imports found in file');
    return content;
  }
  
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;
  
  const loggingImport = '\nimport { logApiMutation, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";';
  
  return content.slice(0, insertPosition) + loggingImport + content.slice(insertPosition);
}

// Count mutations in a file
function countMutations(content) {
  const mutationMatches = content.match(/\.mutation\(/g);
  return mutationMatches ? mutationMatches.length : 0;
}

// Check if a mutation already has logging
function hasLogging(mutationContent) {
  return mutationContent.includes('logApiMutation');
}

// Process a single router file
function processRouter(filename) {
  const filepath = path.join(routersDir, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return { filename, status: 'not_found', mutations: 0 };
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  const mutationCount = countMutations(content);
  
  if (mutationCount === 0) {
    console.log(`⏭️  ${filename}: No mutations found`);
    return { filename, status: 'no_mutations', mutations: 0 };
  }
  
  const hasImport = hasLoggingImport(content);
  
  if (hasImport) {
    console.log(`✅ ${filename}: Already has logging (${mutationCount} mutations)`);
    return { filename, status: 'has_logging', mutations: mutationCount };
  }
  
  console.log(`📝 ${filename}: Found ${mutationCount} mutations - needs logging`);
  return { filename, status: 'needs_logging', mutations: mutationCount };
}

// Main function
function main() {
  console.log('🔍 Scanning router files for mutations...\n');
  
  const results = {
    total: 0,
    needsLogging: [],
    hasLogging: [],
    noMutations: [],
    notFound: [],
  };
  
  // Get all router files
  const allRouters = fs.readdirSync(routersDir)
    .filter(file => file.endsWith('.ts') && !file.includes('test'));
  
  // Process priority routers first
  const processedFiles = new Set();
  
  console.log('=== PRIORITY ROUTERS ===\n');
  priorityRouters.forEach(filename => {
    const result = processRouter(filename);
    processedFiles.add(filename);
    results.total += result.mutations;
    
    if (result.status === 'needs_logging') {
      results.needsLogging.push(result);
    } else if (result.status === 'has_logging') {
      results.hasLogging.push(result);
    } else if (result.status === 'no_mutations') {
      results.noMutations.push(result);
    } else if (result.status === 'not_found') {
      results.notFound.push(result);
    }
  });
  
  console.log('\n=== OTHER ROUTERS ===\n');
  allRouters.forEach(filename => {
    if (processedFiles.has(filename)) return;
    
    const result = processRouter(filename);
    results.total += result.mutations;
    
    if (result.status === 'needs_logging') {
      results.needsLogging.push(result);
    } else if (result.status === 'has_logging') {
      results.hasLogging.push(result);
    } else if (result.status === 'no_mutations') {
      results.noMutations.push(result);
    }
  });
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total mutations found: ${results.total}`);
  console.log(`Files with logging: ${results.hasLogging.length} (${results.hasLogging.reduce((sum, r) => sum + r.mutations, 0)} mutations)`);
  console.log(`Files needing logging: ${results.needsLogging.length} (${results.needsLogging.reduce((sum, r) => sum + r.mutations, 0)} mutations)`);
  console.log(`Files with no mutations: ${results.noMutations.length}`);
  
  if (results.needsLogging.length > 0) {
    console.log('\n📋 FILES NEEDING LOGGING:');
    results.needsLogging
      .sort((a, b) => b.mutations - a.mutations)
      .forEach(r => {
        console.log(`  • ${r.filename} (${r.mutations} mutations)`);
      });
  }
  
  // Write report to file
  const report = {
    timestamp: new Date().toISOString(),
    totalMutations: results.total,
    summary: {
      hasLogging: results.hasLogging.length,
      needsLogging: results.needsLogging.length,
      noMutations: results.noMutations.length,
    },
    filesNeedingLogging: results.needsLogging,
    filesWithLogging: results.hasLogging,
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'mutation-logging-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Report saved to: scripts/mutation-logging-report.json');
}

main();
