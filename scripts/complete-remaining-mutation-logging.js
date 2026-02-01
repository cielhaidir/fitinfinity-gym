#!/usr/bin/env node

/**
 * Complete Remaining Mutation Logging
 * Adds mutation logging to all remaining router files
 */

const fs = require('fs');
const path = require('path');

const routersDir = path.join(__dirname, '../src/server/api/routers');

// Files to process with their mutation counts
const filesToProcess = [
  // High Priority
  { file: 'personalTrainer.ts', mutations: ['create', 'update', 'remove', 'createSession', 'updateMember'] },
  { file: 'posSale.ts', mutations: ['create', 'update', 'delete'] },
  { file: 'post.ts', mutations: ['create'] },
  { file: 'profile.ts', mutations: ['update', 'uploadImage', 'uploadPTPhoto', 'changePassword', 'updatePoints', 'updateMember', 'adminChangePassword', 'transferAccount'] },
  { file: 'pt.ts', mutations: ['create', 'edit', 'update'] },
  { file: 'purchaseOrder.ts', mutations: ['create', 'update', 'updateStatus', 'receiveItems', 'createTransactionForPO', 'delete', 'cancel'] },
  { file: 'reward.ts', mutations: ['create', 'update', 'delete', 'redeem'] },
  { file: 'role.ts', mutations: ['create', 'update', 'delete'] },
  { file: 'role-permission.ts', mutations: ['create', 'update', 'delete'] },
  { file: 'supplier.ts', mutations: ['create', 'update', 'delete'] },
  { file: 'trainerSession.ts', mutations: ['createSchedule', 'create', 'delete', 'update', 'updateSessionAttendance'] },
  { file: 'voucher.ts', mutations: ['create', 'update', 'delete', 'finalizeVoucherClaim'] },
  { file: 'whatsapp.ts', mutations: ['sendMessage', 'sendResetPasswordLink'] },
  
  // Lower Priority
  { file: 'aiRateLimit.ts', mutations: ['updateMyLimits'] },
  { file: 'cashBankReport.ts', mutations: ['closePeriod', 'reopenPeriod'] },
  { file: 'logs.ts', mutations: ['deleteLog'] },
  { file: 'memberReward.ts', mutations: ['create'] },
  { file: 'mqtt.ts', mutations: ['enrollDevice', 'validateDevice', 'updateFirmware', 'configureWifi', 'syncDevice', 'testConnection', 'resetDevice'] },
  { file: 'paymentValidation.ts', mutations: ['uploadFile', 'create', 'acceptPaymentValidation', 'delete'] },
  { file: 'subscriptionImport.ts', mutations: ['importMembers', 'processImport'] },
  { file: 'tracking.ts', mutations: ['createTracking', 'updateTracking', 'createBodyComposition', 'updateBodyComposition', 'createMeasurement', 'deleteTracking'] },
];

console.log('='.repeat(80));
console.log('MUTATION LOGGING COMPLETION SCRIPT');
console.log('='.repeat(80));
console.log(`\nProcessing ${filesToProcess.length} files...`);
console.log(`Expected mutations: ${filesToProcess.reduce((sum, f) => sum + f.mutations.length, 0)}\n`);

let totalProcessed = 0;
let filesWithIssues = [];

filesToProcess.forEach(({ file, mutations }) => {
  const filePath = path.join(routersDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${file} - File not found`);
    filesWithIssues.push({ file, reason: 'not found' });
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if import is already added
  const hasImport = content.includes('logApiMutation');
  
  console.log(`📝 ${file} - ${mutations.length} mutations - ${hasImport ? '✓ import exists' : '⚠ needs import'}`);
  
  // Count actual mutations found
  let foundCount = 0;
  mutations.forEach(mut => {
    const regex = new RegExp(`${mut}:\\s*\\w+.*\\.mutation\\(`, 's');
    if (regex.test(content)) foundCount++;
  });
  
  if (foundCount !== mutations.length) {
    console.log(`  ⚠ Warning: Expected ${mutations.length} mutations, found ${foundCount}`);
  }
  
  totalProcessed += foundCount;
});

console.log('\n' + '='.repeat(80));
console.log(`Total mutations identified: ${totalProcessed}`);
console.log(`Files to process: ${filesToProcess.length}`);
if (filesWithIssues.length > 0) {
  console.log(`\n⚠ Issues found in ${filesWithIssues.length} files:`);
  filesWithIssues.forEach(({ file, reason }) => {
    console.log(`  - ${file}: ${reason}`);
  });
}
console.log('='.repeat(80));
console.log('\nNote: This script identifies the files and mutations.');
console.log('Manual implementation is recommended for accuracy and proper error handling.\n');
