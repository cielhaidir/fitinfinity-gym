const fs = require('fs');
const path = require('path');

// Mapping of URL patterns to their required permissions from menu.ts
const urlPermissionMap = {
  '/management/schedule': 'menu:trainers',
  '/management/personal-trainer': 'menu:trainers', 
  '/management/package': 'menu:packages',
  '/management/class': 'menu:manage-classes',
  '/management/employee': 'menu:employees',
  '/management/device': 'menu:employees',
  '/management/attendance': 'menu:employees',
  '/management/user': 'menu:user',
  '/management/voucher': 'menu:voucher',
  '/management/role-permission': 'menu:role-permission',
  '/management/permission': 'menu:permission',
  '/management/role': 'menu:role',
  '/management/fitness-consultant': 'menu:manage-fc',
  '/management/subscription': 'menu:subscription',
  '/management/reward': 'menu:reward',
  '/management/config/email': 'menu:config',
  '/pos': 'menu:pos-sale',
  '/management/pos-category': 'menu:pos-category',
  '/management/pos-item': 'menu:pos-item',
  '/admin': 'menu:dashboard-admin',
  '/admin/payment-validation': 'menu:payment',
  '/admin/member': 'menu:member',
  '/admin/class/register': 'menu:member',
  '/admin/checkin-logs': 'menu:member',
  '/admin/class-attendance': 'menu:class-attendance',
  '/admin/package-management': 'menu:package-management',
  '/admin/group-management': 'menu:group-management',
  '/admin/personal-trainer-management': 'menu:personal-trainer-management',
  '/admin/reward': 'menu:reward',
  '/admin/subscription-history': 'menu:transaction',
  '/member': 'menu:dashboard-member',
  '/member/classes': 'menu:classes',
  '/member/calendar-session': 'menu:session',
  '/member/payment-history': 'menu:payment-history',
  '/member/groups': 'menu:groups',
  '/member/profile': 'member:profile',
  '/member/body-composition': 'menu:payment-history',
  '/fitness-consultants': 'menu:dashboard-fc',
  '/fitness-consultants/members': 'menu:fc-member',
  '/personal-trainers': 'menu:dashboard-pt',
  '/personal-trainers/profile': 'menu:profile-pt',
  '/personal-trainers/schedule': 'menu:schedule-pt',
  '/personal-trainers/member-list': 'menu:member-list-pt',
  '/finance': 'menu:dashboard-finance',
  '/finance/balance-account': 'menu:balances',
  '/finance/chart-of-account': 'menu:coa',
  '/management/transaction': 'menu:transaction',
  '/finance/subscription-history': 'menu:transaction',
  '/reports/member-attendance': 'report:member-attendance',
  '/reports/attendance-management': 'report:employees',
  '/reports/class-member-report': 'report:class-member-report',
  '/reports/personal-trainers': 'report:pt',
  '/reports/sales-report': 'report:sales',
  '/reports/commission-report': 'report:commission',
  '/finance/cash-bank-report': 'report:cash-bank'
};

// Function to convert URL to file path
function urlToFilePath(url) {
  if (url === '/admin') return 'src/app/(authenticated)/admin/page.tsx';
  if (url === '/member') return 'src/app/(authenticated)/member/page.tsx';
  if (url === '/finance') return 'src/app/(authenticated)/finance/page.tsx';
  if (url === '/pos') return 'src/app/(authenticated)/pos/page.tsx';
  if (url === '/fitness-consultants') return 'src/app/(authenticated)/fitness-consultants/page.tsx';
  if (url === '/personal-trainers') return 'src/app/(authenticated)/personal-trainers/page.tsx';
  
  return `src/app/(authenticated)${url}/page.tsx`;
}

// Function to check if file already has ProtectedRoute
function hasProtectedRoute(filePath) {
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('ProtectedRoute');
}

// Generate protection status report
console.log('Route Protection Analysis');
console.log('='.repeat(80));

const protectionNeeded = [];
const alreadyProtected = [];
const fileNotFound = [];

Object.entries(urlPermissionMap).forEach(([url, permission]) => {
  const filePath = urlToFilePath(url);
  const hasProtection = hasProtectedRoute(filePath);
  
  if (hasProtection === null) {
    fileNotFound.push({ url, filePath, permission });
  } else if (hasProtection) {
    alreadyProtected.push({ url, filePath, permission });
  } else {
    protectionNeeded.push({ url, filePath, permission });
  }
});

console.log('\n📋 SUMMARY:');
console.log(`✅ Already Protected: ${alreadyProtected.length}`);
console.log(`⚠️  Need Protection: ${protectionNeeded.length}`);
// console.log(`❌ File Not Found: ${fileNotFound.length}`);

console.log('\n🔒 PAGES THAT NEED PROTECTION:');
console.log('-'.repeat(50));
protectionNeeded.forEach(({ url, filePath, permission }) => {
  console.log(`URL: ${url}`);
  console.log(`File: ${filePath}`);
  console.log(`Permission: ${permission}`);
  console.log('-'.repeat(30));
});

console.log('\n✅ ALREADY PROTECTED:');
console.log('-'.repeat(50));
alreadyProtected.forEach(({ url, filePath, permission }) => {
  console.log(`URL: ${url} ✓`);
});

if (fileNotFound.length > 0) {
  console.log('\n❌ FILES NOT FOUND:');
  console.log('-'.repeat(50));
  fileNotFound.forEach(({ url, filePath, permission }) => {
    console.log(`URL: ${url}`);
    console.log(`Expected: ${filePath}`);
    console.log('-'.repeat(30));
  });
}

// Export data for potential scripting
module.exports = { protectionNeeded, alreadyProtected, fileNotFound, urlPermissionMap };