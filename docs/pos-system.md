# Point of Sale (POS) System

This POS system provides comprehensive functionality for managing additional items like drinks and snacks in your fitness center.

## Features

### 1. Category Management
- Create, edit, and delete categories for organizing items
- Set category status (active/inactive)
- View item count per category

**Location**: `/management/pos-category`
**Required Permission**: `list:pos-category`

### 2. Item Management
- Create, edit, and delete items
- Set pricing, cost, and stock levels
- Set minimum stock alerts
- Assign items to categories
- Track inventory levels

**Location**: `/management/pos-item`
**Required Permission**: `list:pos-item`

### 3. Point of Sale Terminal
- Select items from different categories
- Add items to cart with quantity controls
- Apply tax and discounts
- Process payments with multiple payment methods
- Select balance account for accounting
- Generate sales transactions
- Automatic stock reduction

**Location**: `/pos`
**Required Permission**: `create:pos-sale`

## Database Models

### POSCategory
- Categories for organizing items (e.g., Beverages, Snacks, Supplements)

### POSItem
- Individual items with pricing, stock, and category information
- Supports cost tracking for profit analysis
- Minimum stock alerts for inventory management

### POSSale
- Sales transactions with multiple items
- Payment information and balance account tracking
- Automatic change calculation

### POSSaleItem
- Individual line items within a sale
- Quantity and pricing at time of sale

## Permissions

The following permissions are required for different operations:

### Category Management
- `list:pos-category` - View categories
- `create:pos-category` - Create new categories
- `edit:pos-category` - Edit existing categories
- `delete:pos-category` - Delete categories
- `show:pos-category` - View category details

### Item Management
- `list:pos-item` - View items
- `create:pos-item` - Create new items
- `edit:pos-item` - Edit existing items
- `delete:pos-item` - Delete items
- `show:pos-item` - View item details

### Sales
- `list:pos-sale` - View sales history
- `create:pos-sale` - Process sales transactions
- `edit:pos-sale` - Edit sales (if needed)
- `delete:pos-sale` - Delete sales (refunds)
- `show:pos-sale` - View sale details

## Usage Flow

1. **Setup Categories**: Create categories like "Beverages", "Snacks", "Supplements"
2. **Add Items**: Create items and assign them to categories with pricing and stock
3. **Process Sales**: Use the POS terminal to select items, add to cart, and process payments
4. **Track Inventory**: Monitor stock levels and receive low stock alerts
5. **Account Integration**: Sales can be linked to balance accounts for financial tracking

## Integration with Existing System

The POS system integrates with:
- **Balance Accounts**: For financial tracking and accounting
- **User System**: Cashier tracking for sales
- **Permission System**: Role-based access control
- **Inventory Management**: Automatic stock updates

## Stock Management

- Items have current stock levels
- Minimum stock thresholds trigger alerts
- Sales automatically reduce stock quantities
- Manual stock adjustments available through item management

## Payment Methods

Supported payment methods:
- Cash
- Card
- Digital Wallet
- Custom payment methods can be added

## Reporting

The system provides:
- Sales reports by date range
- Top-selling items analysis
- Payment method breakdowns
- Cashier performance tracking
- Low stock alerts