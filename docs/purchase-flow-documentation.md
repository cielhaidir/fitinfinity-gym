# Purchase Flow Documentation

## Overview

This document describes the complete purchase flow implementation in the Fit Infinity gym management system. The system supports both **online payments** (via DOKU payment gateway) and **offline payments** (manual validation with proof upload).

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Checkout UI   │───▶│  Payment APIs   │───▶│  Payment Gateway│
│   (Frontend)    │    │   (Backend)     │    │     (DOKU)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │    Database     │    │    Webhooks     │
                       │   (Payments)    │    │  (Status Updates)│
                       └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Frontend Components

#### `/src/app/(authenticated)/checkout/[memberID]/page.tsx`
**Main Checkout Page**

**Key Features:**
- **Package Selection**: Gym membership or Personal trainer packages
- **Payment Method Selection**: Multiple payment gateways
- **Voucher System**: Discount application
- **Membership Validation**: Enforces gym membership requirement for trainer packages

**Payment Methods Supported:**
- ✅ **DOKU Pay** - Digital payments (cards, e-wallets)
- ✅ **QRIS Offline** - QR code payment at gym with manual validation
- 🚧 **ShopeePay** - Coming soon
- 🚧 **Kredivo** - Coming soon  
- 🚧 **Akulaku** - Coming soon

**Flow Logic:**
```typescript
// Check active gym membership for trainer packages
const hasActiveGymMembership = memberSubscriptions?.items?.some(subscription => {
  const isGymMembership = subscription.package.type === "GYM_MEMBERSHIP";
  const isActive = subscription.endDate ? new Date(subscription.endDate) > new Date() : false;
  const isPaid = subscription.payments?.some(payment => payment.status === "SUCCESS");
  return isGymMembership && isActive && isPaid;
});
```

#### `/src/app/(authenticated)/checkout/confirmation/[memberID]/page.tsx`
**Payment Confirmation Page**

**Key Features:**
- **Real-time Status Updates**: Shows current payment status
- **Manual Status Checking**: Button to query payment gateway
- **Continue Payment**: Resume interrupted payments
- **Subscription Details**: Complete order information

**Status Management:**
- `SUCCESS` - Payment completed, subscription activated
- `PENDING` - Awaiting payment confirmation
- `FAILED` - Payment failed or cancelled

### 2. Backend APIs

#### `/src/server/api/routers/payment.ts`
**Online Payment Processing**

**Key Endpoints:**

**`createTransaction`** - Initiates payment with gateway
```typescript
input: {
  orderId: string,
  amount: number,
  subscriptionId: string,
  customerName?: string,
  customerEmail?: string,
  itemDetails?: ItemDetail[],
  callbackUrl?: string,
  paymentGateway: "midtrans" | "doku" | "shopee" | "kredivo" | "akulaku" | "qr"
}
```

**Payment Gateway Handlers:**
1. **DOKU** - Full digital payment solution
2. **Shopee** - E-wallet integration (with error handling)
3. **Kredivo** - Buy now, pay later
4. **QRIS** - QR code generation for online payments
5. **Midtrans** - Legacy support (commented out)

**`handleNotification`** - Processes payment gateway webhooks
```typescript
// Maps DOKU transaction status to internal status
const status = transactionStatus === "SUCCESS" || transactionStatus === "SETTLED" 
  ? "SUCCESS" 
  : transactionStatus === "CANCELED" || transactionStatus === "FAILED" || transactionStatus === "EXPIRED"
    ? "FAILED" 
    : "PENDING";
```

**`checkStatus`** - Manual payment status inquiry
```typescript
const result = await dokuPaymentService.inquirePayment(input.orderId);
```

#### `/src/server/api/routers/paymentValidation.ts`
**Offline Payment Processing**

**Key Endpoints:**

**`uploadFile`** - Handles payment proof uploads
```typescript
// File validation
const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
const maxSize = 5 * 1024 * 1024; // 5MB limit

// File storage
const uploadDir = path.join(process.cwd(), "public", "assets", "transaction", memberId);
```

**`create`** - Creates payment validation record
```typescript
// Creates PaymentValidation with WAITING status
const paymentValidation = await tx.paymentValidation.create({
  data: {
    memberId, packageId, trainerId, subsType, duration, sessions,
    totalPayment, paymentMethod, filePath,
    paymentStatus: PaymentValidationStatus.WAITING,
  },
});

// Handles voucher claims if applicable
if (voucherId) {
  await tx.voucherClaim.create({ data: { memberId: user.id, voucherId } });
  await tx.voucher.update({ where: { id: voucherId }, data: { maxClaim: { decrement: 1 } } });
}
```

**`accept`** - Admin approves offline payment
```typescript
// Database transaction for atomicity
return ctx.db.$transaction(async (prisma) => {
  // 1. Update PaymentValidation status
  await prisma.paymentValidation.update({
    where: { id: input.id },
    data: { paymentStatus: PaymentValidationStatus.ACCEPTED, balanceId: input.balanceId },
  });

  // 2. Create Subscription
  const subscription = await prisma.subscription.create({
    data: { memberId, packageId, trainerId, startDate, endDate, remainingSessions, isActive: true },
  });

  // 3. Create Payment record
  await prisma.payment.create({
    data: { subscriptionId: subscription.id, status: PaymentStatus.SUCCESS, method, totalPayment },
  });

  // 4. Send email notifications
  // 5. Award loyalty points
});
```

**`decline`** - Admin rejects offline payment
**`listWaiting`** - Gets pending validations for admin
**`getAllPayments`** - Combined view of online and offline payments
**`getMemberPayments`** - Member's payment history

### 3. Webhook Processing

#### `/src/app/api/webhooks/doku/route.ts`
**DOKU Payment Gateway Webhook Handler**

**Security Features:**
```typescript
// Webhook signature verification
const isValid = dokuPaymentService.verifyWebhookSignatureFromHeaders(
  rawBody, target, request.headers
);

if (!isValid) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

**Payment Processing:**
```typescript
// Extract webhook data
const orderId = webhookData.order?.invoice_number || webhookData.partnerReferenceNo;
const dokuStatus = webhookData.order?.status || webhookData.transaction?.status;

// Update payment status
const newStatus = mapDokuStatus(dokuStatus);
const updatedPayment = await db.payment.update({
  where: { id: payment.id },
  data: { status: newStatus, paidAt: newStatus === "SUCCESS" ? new Date() : payment.paidAt },
});

// Activate membership on success
if (newStatus === "SUCCESS" && payment.subscription) {
  await db.membership.update({
    where: { id: payment.subscription.memberId },
    data: { isActive: true },
  });

  // Award loyalty points
  if (package.point > 0) {
    await db.user.update({
      where: { id: member.userId },
      data: { point: { increment: package.point } },
    });
  }
}
```

## Payment Flow Diagrams

### Online Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Checkout UI
    participant A as Payment API
    participant D as DOKU Gateway
    participant W as Webhook
    participant DB as Database

    U->>C: Select package & payment method
    C->>A: createTransaction()
    A->>DB: Create pending payment
    A->>D: Initialize payment
    D-->>A: Return payment URL
    A-->>C: Return redirect URL
    C->>D: Redirect to payment page
    U->>D: Complete payment
    D->>W: Send webhook notification
    W->>DB: Update payment status
    W->>DB: Activate subscription
    D-->>C: Redirect to confirmation
    C->>U: Show success/failure
```

### Offline Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Checkout UI
    participant V as Validation API
    participant A as Admin
    participant DB as Database

    U->>C: Select QRIS offline payment
    C->>V: uploadFile()
    V->>DB: Store payment proof
    C->>V: create()
    V->>DB: Create PaymentValidation (WAITING)
    A->>V: listWaiting()
    V-->>A: Show pending validations
    A->>V: accept() or decline()
    V->>DB: Update status & create subscription
    V->>U: Send email notification
```

## Database Schema

### Core Tables

**Payments** (Online payments)
```sql
CREATE TABLE payments (
  id VARCHAR(36) PRIMARY KEY,
  subscriptionId VARCHAR(36) NOT NULL,
  orderReference VARCHAR(255) UNIQUE,
  method VARCHAR(50) NOT NULL,
  totalPayment DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELED', 'EXPIRED') NOT NULL,
  token VARCHAR(255),
  tokenExpiry DATETIME,
  paymentUrl TEXT,
  gatewayResponse JSON,
  paidAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**PaymentValidations** (Offline payments)
```sql
CREATE TABLE paymentValidations (
  id VARCHAR(36) PRIMARY KEY,
  memberId VARCHAR(36) NOT NULL,
  packageId VARCHAR(36) NOT NULL,
  trainerId VARCHAR(36),
  subsType VARCHAR(20) NOT NULL,
  duration INT NOT NULL,
  sessions INT,
  totalPayment DECIMAL(10,2) NOT NULL,
  paymentMethod VARCHAR(50) NOT NULL,
  filePath VARCHAR(500),
  paymentStatus ENUM('WAITING', 'ACCEPTED', 'DECLINED') DEFAULT 'WAITING',
  balanceId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Subscriptions** (Active memberships)
```sql
CREATE TABLE subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  memberId VARCHAR(36) NOT NULL,
  packageId VARCHAR(36) NOT NULL,
  trainerId VARCHAR(36),
  startDate DATE NOT NULL,
  endDate DATE,
  remainingSessions INT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Payment Gateway Integration

### DOKU Payment Service

**Configuration:**
```typescript
// Environment variables required
DOKU_CLIENT_ID=your_client_id
DOKU_SECRET_KEY=your_secret_key
DOKU_PRIVATE_KEY=your_private_key_path
DOKU_BASE_URL=https://api.doku.com (production) / https://api-sandbox.doku.com (sandbox)
```

**Supported Payment Methods:**
- Credit/Debit Cards
- Bank Transfers
- E-wallets (OVO, DANA, LinkAja, etc.)
- QRIS payments
- Buy now, pay later (Kredivo, Akulaku)

**Key Functions:**
- `createPayment()` - Initialize payment
- `createQrisPayment()` - Generate QR code
- `createShopeePayment()` - ShopeePay integration
- `createKredivoPayment()` - Kredivo integration
- `inquirePayment()` - Check payment status
- `verifyWebhookSignatureFromHeaders()` - Webhook security

## Error Handling

### Payment Gateway Errors
```typescript
// ShopeePay configuration error handling
catch (error) {
  await ctx.db.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED" },
  });
  
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: error instanceof Error && error.message.includes('Private key') 
      ? "ShopeePay is not available. Please contact administrator."
      : `ShopeePay payment failed: ${error.message}`,
  });
}
```

### File Upload Validation
```typescript
// File type and size validation
const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
if (!validTypes.includes(fileType)) {
  throw new Error("Invalid file type. Only PNG, JPG, JPEG, and PDF files are allowed.");
}

const maxSize = 5 * 1024 * 1024; // 5MB
if (buffer.length > maxSize) {
  throw new Error("File size too large. Maximum size is 5MB.");
}
```

## Security Features

### Webhook Security
- **Signature Verification**: All webhooks verified with HMAC signatures
- **IP Whitelisting**: Only accept webhooks from known payment gateway IPs
- **Replay Attack Prevention**: Timestamp validation on webhook payloads

### File Upload Security
- **Type Validation**: Only image and PDF files allowed
- **Size Limits**: Maximum 5MB file size
- **Unique Naming**: UUID-based filenames prevent conflicts
- **Secure Storage**: Files stored outside web root with access controls

### Payment Security
- **Token Expiry**: Payment tokens expire after 24 hours
- **Order Reference**: Unique order IDs prevent duplicate processing
- **Status Validation**: Prevent status tampering with database constraints

## Email Notifications

### Payment Receipt Email
Sent automatically when payment is successful:
```typescript
templateData: {
  memberName, packageName, receiptNumber, totalAmount,
  paymentStatus, paymentDate, paymentMethod, duration,
  currency, memberEmail, supportEmail, logoUrl,
  // Conditional trainer information
  ...(trainer && { personalTrainer: true, trainerName }),
  // Discount information if voucher used
  ...(discount > 0 && { subtotal, discount }),
}
```

### Membership Confirmation Email
Sent when subscription is activated:
```typescript
templateData: {
  memberName, membershipId, packageName,
  startDate, endDate, personalTrainer, trainerName,
  portalUrl, supportEmail, currentYear,
}
```

## Admin Features

### Payment Validation Dashboard
- **Pending Payments**: List of offline payments awaiting approval
- **Payment History**: Combined view of online and offline transactions
- **Proof Review**: View uploaded payment proofs
- **Bulk Actions**: Accept/decline multiple payments

### Analytics and Reporting
- **Revenue Tracking**: Total payments by method and period
- **Package Performance**: Most popular packages and pricing
- **Member Analytics**: Payment patterns and subscription trends

## API Usage Examples

### Create Online Payment
```typescript
const payment = await api.payment.createTransaction.mutate({
  orderId: `FIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  amount: 500000,
  subscriptionId: "sub_123",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  paymentGateway: "doku",
  callbackUrl: "https://yoursite.com/checkout/confirmation",
  itemDetails: [{
    id: "pkg_001",
    name: "Monthly Gym Membership",
    price: 500000,
    quantity: 1,
    category: "services"
  }]
});
```

### Upload Payment Proof
```typescript
const upload = await api.paymentValidation.uploadFile.mutate({
  fileData: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
  fileName: "payment_proof.jpg",
  fileType: "image/jpeg",
  memberId: "member_123"
});
```

### Check Payment Status
```typescript
const status = await api.payment.checkStatus.query({
  orderId: "FIT-1640995200000-123"
});
```

## Testing and Development

### Sandbox Environment
- **DOKU Sandbox**: Use sandbox URLs and test credentials
- **Test Cards**: Specific card numbers for testing different scenarios
- **Webhook Testing**: Use ngrok or similar tools for local webhook testing

### Test Scenarios
1. **Successful Payment**: Complete payment flow end-to-end
2. **Failed Payment**: Test error handling and status updates
3. **Pending Payment**: Simulate delayed payment confirmation
4. **Webhook Failures**: Test retry mechanisms and error recovery
5. **File Upload**: Test various file types and size limits

## Deployment Considerations

### Environment Variables
```bash
# DOKU Payment Gateway
DOKU_CLIENT_ID=prod_client_id
DOKU_SECRET_KEY=prod_secret_key
DOKU_PRIVATE_KEY=/path/to/prod/private.key
DOKU_BASE_URL=https://api.doku.com

# Database
DATABASE_URL=mysql://user:pass@host/database

# Email Service
SMTP_HOST=smtp.server.com
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=your_smtp_password

# File Storage
UPLOAD_PATH=/var/uploads/payment-proofs
MAX_FILE_SIZE=5242880
```

### Production Setup
1. **SSL/TLS**: Ensure all payment pages use HTTPS
2. **Database Backups**: Regular backups of payment and subscription data
3. **Monitoring**: Set up alerts for failed payments and webhook errors
4. **Load Balancing**: Handle high traffic during peak subscription periods
5. **PCI Compliance**: Follow payment card industry security standards

## Future Enhancements

### Planned Features
- **Recurring Payments**: Automatic subscription renewals
- **Payment Plans**: Installment payment options
- **Multiple Currency**: Support for USD and other currencies
- **Mobile App**: React Native integration
- **Advanced Analytics**: Revenue forecasting and member lifetime value

### Integration Roadmap
- **WhatsApp Business**: Payment notifications via WhatsApp
- **Mobile Banking**: Direct bank account integration
- **Cryptocurrency**: Bitcoin and stablecoin payments
- **Buy Now Pay Later**: More BNPL provider integrations

This documentation provides a comprehensive overview of the purchase flow implementation in the Fit Infinity system, covering both technical implementation details and business logic for online and offline payment processing.