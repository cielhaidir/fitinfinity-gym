# Payment Integration Guide

This guide explains how to use the enhanced payment system with Shopee, Kredivo, and Akulaku support.

## Overview

The system now supports multiple payment gateways:
- **Midtrans**: Credit cards, e-wallets (existing)
- **DOKU**: Digital payments (existing)
- **ShopeePay**: SNAP integration (new)
- **Kredivo**: Peer-to-peer payment (new)
- **Akulaku**: Peer-to-peer payment (new)

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# DOKU Configuration
DOKU_CLIENT_ID=your_client_id
DOKU_SECRET_KEY=your_secret_key
DOKU_API_URL=https://api-sandbox.doku.com  # Use https://api.doku.com for production
DOKU_SANDBOX_MODE=true  # Set to false for production

# For SNAP payments (ShopeePay), you need a private key file from DOKU
DOKU_PRIVATE_KEY_PATH="./keys/doku-private.pem"  # Path to your private key file
```

### Important Notes:
- **ShopeePay requires a private key**: Without it, ShopeePay payments will fail
- **Kredivo and Akulaku work without private key**: They use the regular DOKU API
- **Get your private key from DOKU**: Contact DOKU support to obtain your RSA private key
- **Use \\n for newlines**: In environment variables, use \\n instead of actual newlines

### Private Key Setup Steps:
1. **Contact DOKU Support**: Request a PKCS#8 format private key for SNAP API
2. **Receive the key file**: DOKU will provide a .pem file
3. **Create keys directory**: Create a `keys` folder in your project root
4. **Place the key file**: Save the .pem file in the keys directory
5. **Set environment variable**: Point `DOKU_PRIVATE_KEY_PATH` to the file
6. **Test the setup**: Try a small ShopeePay transaction

### Key File Structure:
```
project-root/
├── keys/
│   └── doku-private.pem    # Your private key file
├── .env                    # Environment variables
└── src/
```

### Temporary Workaround:
If you don't have the private key yet, you can:
- **Comment out ShopeePay**: Remove the ShopeePay option from the UI
- **Use other methods**: Kredivo and Akulaku work immediately
- **Keep Midtrans**: Existing Midtrans integration continues to work

## Payment Gateway Types

### 1. SNAP Payments (ShopeePay)
- Uses DOKU SNAP API
- Requires RSA private key for signature
- Minimum amount: IDR 10,000
- Redirects to ShopeePay app/web

### 2. Peer-to-Peer Payments (Kredivo, Akulaku)
- Uses DOKU P2P API
- Requires customer name and email
- Supports installment payments
- Redirects to respective payment platforms

## Integration Steps

### 1. Frontend Integration

The checkout page now includes new payment method options:

```tsx
// Payment method selection
<RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
  <RadioGroupItem value="midtrans" />  {/* Existing */}
  <RadioGroupItem value="doku" />      {/* Existing */}
  <RadioGroupItem value="shopee" />    {/* New */}
  <RadioGroupItem value="kredivo" />   {/* New */}
  <RadioGroupItem value="akulaku" />   {/* New */}
</RadioGroup>
```

### 2. Backend API

The payment router automatically handles different gateways:

```typescript
// Create transaction with specific gateway
const transaction = await createPaymentMutation.mutateAsync({
  orderId: "UNIQUE_ORDER_ID",
  amount: 50000,
  subscriptionId: "subscription_id",
  customerName: "Customer Name",
  customerEmail: "customer@email.com",
  paymentGateway: "shopee", // or "kredivo", "akulaku"
  callbackUrl: "https://yoursite.com/callback",
});
```

### 3. Webhook Handling

DOKU webhooks are handled at `/api/webhooks/doku`:

```typescript
// Automatic webhook processing
POST /api/webhooks/doku
```

## Payment Flow

### ShopeePay (SNAP)
1. User selects ShopeePay
2. System calls DOKU SNAP API
3. User redirected to ShopeePay
4. Payment completed in ShopeePay app
5. Webhook received for status update

### Kredivo/Akulaku (P2P)
1. User selects Kredivo/Akulaku
2. System calls DOKU P2P API
3. User redirected to payment platform
4. User completes payment/installment setup
5. Webhook received for status update

## Status Mapping

DOKU payment statuses are mapped to system statuses:

```typescript
const statusMap = {
  'INITIATED': 'PENDING',
  'PENDING': 'PENDING',
  'COMPLETED': 'SUCCESS',
  'CANCELLED': 'CANCELED',
  'FAILED': 'FAILED',
  'EXPIRED': 'EXPIRED',
  'REFUNDED': 'REFUNDED',
};
```

## Testing

### Sandbox Environment
- Use sandbox URLs and credentials
- Test with small amounts (minimum IDR 10,000 for ShopeePay)
- Verify webhook handling

### Test Cases
1. Successful payment flow
2. Failed payment handling
3. Webhook processing
4. Status updates
5. Membership activation

## Security Considerations

1. **Private Key**: Store DOKU private key securely
2. **Webhook Signature**: Always verify webhook signatures
3. **HTTPS**: Use HTTPS for all webhook endpoints
4. **Environment Variables**: Never commit sensitive credentials

## Troubleshooting

### Common Issues

1. **Invalid Signature**: Check private key format and client ID
2. **Webhook Not Received**: Verify endpoint URL and firewall settings
3. **Payment Failed**: Check minimum amounts and customer data
4. **Redirect Issues**: Ensure callback URLs are correct

### Debug Mode

Enable debug logging by adding:

```typescript
console.log('Payment Request:', requestData);
console.log('Payment Response:', responseData);
```

## Production Deployment

1. Update environment variables for production
2. Change API URLs to production endpoints
3. Set `DOKU_SANDBOX_MODE=false`
4. Test webhook endpoints
5. Monitor payment flows

## Support

For DOKU-related issues:
- Documentation: https://docs.doku.com
- Support: support@doku.com

For implementation issues:
- Check logs for detailed error messages
- Verify environment variable configuration
- Test webhook signature verification