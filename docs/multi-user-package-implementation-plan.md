# Multi-User Package Implementation Plan

## Current Structure Analysis
- Current packages support: `GYM_MEMBERSHIP` and `PERSONAL_TRAINER`
- Each package is designed for single user subscription
- Fields: `name`, `description`, `price`, `point`, `type`, `sessions`, `day`, `isActive`

## Proposed Multi-User Package System

### 1. Database Schema Updates

#### New Package Type
```typescript
// Add to PackageTypeEnum
export const PackageTypeEnum = z.enum([
  "GYM_MEMBERSHIP", 
  "PERSONAL_TRAINER", 
  "GROUP_TRAINING"  // New type for multi-user packages
]);
```

#### Enhanced Package Schema
```typescript
export const PackageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  point: z.number().min(0, "Points must be greater than or equal to 0").default(0),
  type: PackageTypeEnum,
  sessions: z.number().nullable(),
  day: z.number().min(0, "Days must be greater than or equal to 0").nullable(),
  isActive: z.boolean().default(true),
  
  // New fields for multi-user packages
  maxUsers: z.number().min(1, "Max users must be at least 1").nullable(),
  isGroupPackage: z.boolean().default(false),
  groupPriceType: z.enum(["TOTAL", "PER_PERSON"]).optional(),
  
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
```

### 2. New Database Tables

#### Group Subscriptions Table
```sql
CREATE TABLE GroupSubscriptions (
  id VARCHAR(36) PRIMARY KEY,
  packageId VARCHAR(36) NOT NULL,
  groupName VARCHAR(255),
  leadUserId VARCHAR(36) NOT NULL, -- Main user who created the group
  totalPrice DECIMAL(10,2) NOT NULL,
  status ENUM('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED') DEFAULT 'PENDING',
  startDate DATE,
  endDate DATE,
  sessionsTotal INT,
  sessionsUsed INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (packageId) REFERENCES Packages(id),
  FOREIGN KEY (leadUserId) REFERENCES Users(id)
);
```

#### Group Members Table
```sql
CREATE TABLE GroupMembers (
  id VARCHAR(36) PRIMARY KEY,
  groupSubscriptionId VARCHAR(36) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  status ENUM('ACTIVE', 'PENDING', 'REMOVED') DEFAULT 'PENDING',
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (groupSubscriptionId) REFERENCES GroupSubscriptions(id),
  FOREIGN KEY (userId) REFERENCES Users(id),
  UNIQUE KEY unique_group_user (groupSubscriptionId, userId)
);
```

#### Group Session Usage Table
```sql
CREATE TABLE GroupSessionUsage (
  id VARCHAR(36) PRIMARY KEY,
  groupSubscriptionId VARCHAR(36) NOT NULL,
  sessionDate DATE NOT NULL,
  attendeeCount INT NOT NULL,
  trainerId VARCHAR(36),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (groupSubscriptionId) REFERENCES GroupSubscriptions(id),
  FOREIGN KEY (trainerId) REFERENCES Users(id)
);
```

### 3. API Endpoints

#### New tRPC Routes
```typescript
// Group package management
router.groupPackage = {
  create: protectedProcedure
    .input(createGroupPackageSchema)
    .mutation(async ({ ctx, input }) => {
      // Create group subscription and invite members
    }),
    
  inviteMembers: protectedProcedure
    .input(inviteMembersSchema)
    .mutation(async ({ ctx, input }) => {
      // Send invitations to join group
    }),
    
  acceptInvitation: protectedProcedure
    .input(acceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      // Accept group invitation
    }),
    
  getGroupSubscriptions: protectedProcedure
    .query(async ({ ctx }) => {
      // Get user's group subscriptions
    }),
    
  bookGroupSession: protectedProcedure
    .input(bookGroupSessionSchema)
    .mutation(async ({ ctx, input }) => {
      // Book session for group
    }),
    
  getGroupMembers: protectedProcedure
    .input(z.object({ groupSubscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get group members and their status
    })
};
```

### 4. UI Components

#### Enhanced Package Form
```typescript
// Add group package fields to package-form.tsx
{newPackage.type === "GROUP_TRAINING" && (
  <>
    <div>
      <label htmlFor="maxUsers" className="block text-sm font-medium">
        Maximum Users
      </label>
      <Input
        id="maxUsers"
        name="maxUsers"
        type="number"
        placeholder="e.g., 4 for Group Training 4 People"
        value={newPackage.maxUsers ?? ""}
        onChange={onInputChange}
        min="2"
        max="20"
      />
    </div>
    
    <div>
      <label htmlFor="groupPriceType" className="block text-sm font-medium">
        Pricing Type
      </label>
      <Select value={newPackage.groupPriceType} onValueChange={handlePriceTypeChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select pricing type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="TOTAL">Total Price (split among members)</SelectItem>
            <SelectItem value="PER_PERSON">Per Person Price</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
    
    <div>
      <label htmlFor="sessions" className="block text-sm font-medium">
        Sessions
      </label>
      <Input
        id="sessions"
        name="sessions"
        type="number"
        placeholder="Number of group sessions"
        value={newPackage.sessions ?? ""}
        onChange={onInputChange}
      />
    </div>
  </>
)}
```

#### New Group Management Components
1. **GroupPackageCard.tsx** - Display group packages
2. **GroupInviteModal.tsx** - Invite members to group
3. **GroupMembersList.tsx** - Manage group members
4. **GroupSessionBooking.tsx** - Book group sessions

### 5. User Flow

#### Creating Group Package
1. Admin creates package with `type: "GROUP_TRAINING"`
2. Sets `maxUsers: 4`, `groupPriceType: "TOTAL"`
3. Package appears in member dashboard as group option

#### Joining Group Package
1. Lead user selects group package
2. Enters group name and invites members via email/phone
3. System creates `GroupSubscription` with `status: "PENDING"`
4. Invited members receive notifications
5. Once minimum members join, group becomes `ACTIVE`

#### Using Group Sessions
1. Any group member can book sessions
2. System tracks attendance and session usage
3. Sessions deducted from group total
4. All members get notifications

### 6. Member Dashboard Updates

#### New Sections
- **My Groups** - Shows active group subscriptions
- **Group Invitations** - Pending invitations to join groups
- **Group Sessions** - Upcoming group sessions

### 7. Admin Dashboard Updates

#### Group Package Management
- Create/edit group packages
- View group subscription analytics
- Manage group disputes/issues

## Implementation Priority

1. **Phase 1**: Database schema updates and migrations
2. **Phase 2**: Basic group package CRUD operations
3. **Phase 3**: Group invitation and member management
4. **Phase 4**: Group session booking and tracking
5. **Phase 5**: Advanced features (notifications, analytics)

## Example Use Cases

### "Group Training 4 People" Package
- `maxUsers: 4`
- `sessions: 12`
- `price: 1200000` (total for group)
- `groupPriceType: "TOTAL"` (300k per person)
- Lead user invites 3 friends
- All 4 can book and attend sessions together

### "Couples Training" Package
- `maxUsers: 2`
- `sessions: 8`
- `price: 800000` (total for couple)
- Perfect for training partners

## Technical Considerations

### Database Migrations
- Add new columns to existing Packages table
- Create new tables for group functionality
- Ensure backward compatibility with existing subscriptions

### Payment Integration
- Update payment flow to handle group payments
- Split payments among group members
- Handle partial payments from group members

### Session Management
- Group session scheduling
- Attendance tracking for group members
- Session usage deduction from group total

### Notifications
- Group invitation notifications
- Session booking notifications to all members
- Session reminders for group members

## Benefits

1. **Increased Revenue**: Higher package values through group sales
2. **Member Retention**: Social aspect keeps members engaged
3. **Referral System**: Built-in member referral mechanism
4. **Flexible Pricing**: Options for total or per-person pricing
5. **Scalability**: Can support various group sizes and types

## Challenges & Solutions

### Challenge: Payment Coordination
**Solution**: Lead user pays initially, system tracks individual contributions

### Challenge: Member Dropouts
**Solution**: Implement replacement member system or pro-rata refunds

### Challenge: Session Scheduling
**Solution**: Group consensus system for session booking

### Challenge: Attendance Tracking
**Solution**: QR codes or check-in system for group sessions

This plan provides a comprehensive multi-user package system that maintains compatibility with existing single-user packages while adding powerful group functionality.