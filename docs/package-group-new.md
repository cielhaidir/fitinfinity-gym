# Multi-User Package Implementation Plan (Updated for User Points)

## Using Existing Schema

Since you want to use the existing `Subscription` and `TrainerSession` models, we'll implement multi-user packages by:
1. Adding group-related fields to the existing `Package` model
2. Creating a linking system between subscriptions for group members
3. Using the existing `TrainerSession` model for group sessions
4. **Updated**: Points are incremented on the `User` model, not `Membership`

## 1. Database Schema Updates

### Enhanced Package Schema
```typescript
// Add to existing Package model
model Package {
  id            String         @id @default(cuid())
  name          String
  description   String?
  price         Float
  point         Int            @default(0)
  type          PackageType
  sessions      Int?
  day           Int?
  isActive      Boolean        @default(true)
  
  // NEW: Group package fields
  maxUsers      Int?           // Maximum users for group packages
  isGroupPackage Boolean       @default(false)
  groupPriceType GroupPriceType? // TOTAL or PER_PERSON
  
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subscriptions Subscription[]
  groupSubscriptions GroupSubscription[]
}

// User model already has points field - no changes needed
model User {
  id                 String            @id @default(cuid())
  memberships        Membership[]      @relation("MembershipToUser")
  accounts           Account[]
  sessions           Session[]
  point              Int               @default(0)  // This exists, no changes needed
  employee           Employee?         @relation("EmployeeToUser")
  memberRewards      MemberReward[]
}

enum PackageType {
  GYM_MEMBERSHIP
  PERSONAL_TRAINER
  GROUP_TRAINING  // New type
}

enum GroupPriceType {
  TOTAL      // Total price split among members
  PER_PERSON // Each person pays the full price
}
```

### New Group Management Tables
```sql
-- Links subscriptions that belong to the same group
CREATE TABLE GroupSubscription (
  id VARCHAR(36) PRIMARY KEY,
  groupName VARCHAR(255),
  leadSubscriptionId VARCHAR(36) NOT NULL, -- Main subscription that created the group
  packageId VARCHAR(36) NOT NULL,
  totalMembers INT NOT NULL,
  maxMembers INT NOT NULL,
  status ENUM('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED') DEFAULT 'PENDING',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (leadSubscriptionId) REFERENCES Subscription(id),
  FOREIGN KEY (packageId) REFERENCES Package(id)
);

-- Links individual subscriptions to group subscriptions
CREATE TABLE GroupMember (
  id VARCHAR(36) PRIMARY KEY,
  groupSubscriptionId VARCHAR(36) NOT NULL,
  subscriptionId VARCHAR(36) NOT NULL,
  status ENUM('ACTIVE', 'PENDING', 'REMOVED') DEFAULT 'PENDING',
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (groupSubscriptionId) REFERENCES GroupSubscription(id),
  FOREIGN KEY (subscriptionId) REFERENCES Subscription(id),
  UNIQUE KEY unique_group_subscription (groupSubscriptionId, subscriptionId)
);
```

## 2. Updated Models

### Subscription Model (No Changes)
```typescript
// Existing model - no changes needed
model Subscription {
  id                String           @id @default(cuid())
  memberId          String
  trainerId         String?
  packageId         String
  member            Membership       @relation(fields: [memberId], references: [id])
  package           Package          @relation(fields: [packageId], references: [id])
  trainer           PersonalTrainer? @relation(fields: [trainerId], references: [id])
  startDate         DateTime
  endDate           DateTime?
  remainingSessions Int?
  isActive          Boolean          @default(false)
  payments          Payment[]
}
```

### TrainerSession Model (No Changes)
```typescript
// Existing model - no changes needed
model TrainerSession {
  id          String   @id @default(cuid())
  trainerId   String
  memberId    String
  date        DateTime
  startTime   DateTime
  endTime     DateTime
  description String?
  status      String   @default("NOT_YET")
  exerciseResult String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  trainer     PersonalTrainer @relation(fields: [trainerId], references: [id])
  member      Membership @relation(fields: [memberId], references: [id])
}
```

## 3. Implementation Logic

### Group Package Creation Flow
1. **Admin Creates Group Package**
   ```typescript
   const groupPackage = {
     name: "Group Training 4 People",
     type: "GROUP_TRAINING",
     maxUsers: 4,
     isGroupPackage: true,
     groupPriceType: "TOTAL",
     price: 1200000,
     sessions: 12
   };
   ```

2. **Lead User Purchases Group Package**
   ```typescript
   // Create lead subscription
   const leadSubscription = await prisma.subscription.create({
     data: {
       memberId: leadUserId,
       packageId: groupPackageId,
       startDate: new Date(),
       remainingSessions: packageSessions,
       isActive: true
     }
   });

   // Create group subscription
   const groupSubscription = await prisma.groupSubscription.create({
     data: {
       groupName: "My Training Group",
       leadSubscriptionId: leadSubscription.id,
       packageId: groupPackageId,
       totalMembers: 1,
       maxMembers: 4,
       status: "PENDING"
     }
   });

   // Add lead as first member
   await prisma.groupMember.create({
     data: {
       groupSubscriptionId: groupSubscription.id,
       subscriptionId: leadSubscription.id,
       status: "ACTIVE"
     }
   });
   ```

3. **Invite Other Members**
   ```typescript
   // When member accepts invitation
   const memberSubscription = await prisma.subscription.create({
     data: {
       memberId: invitedUserId,
       packageId: groupPackageId,
       startDate: new Date(),
       remainingSessions: packageSessions, // Same as lead
       isActive: true
     }
   });

   // Add to group
   await prisma.groupMember.create({
     data: {
       groupSubscriptionId: groupSubscription.id,
       subscriptionId: memberSubscription.id,
       status: "ACTIVE"
     }
   });

   // Update group member count
   await prisma.groupSubscription.update({
     where: { id: groupSubscription.id },
     data: { totalMembers: { increment: 1 } }
   });
   ```

### Group Session Management

#### Enhanced Session Creation (Modify existing create method)
```typescript
// Add to existing trainerSessionRouter.create mutation
// After successful session creation, check if it's a group session and increment points

// In the transaction, after creating the session:
const session = await tx.trainerSession.create({
  data: {
    trainerId: trainer.id,
    memberId: input.memberId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    description: input.description,
  },
});

// Check if this member is part of a group subscription
const groupMember = await tx.groupMember.findFirst({
  where: {
    subscription: {
      memberId: input.memberId,
      trainerId: trainer.id,
    },
    status: "ACTIVE"
  },
  include: {
    groupSubscription: {
      include: {
        package: true
      }
    },
    subscription: {
      include: {
        member: {
          include: {
            user: true
          }
        }
      }
    }
  }
});

if (groupMember) {
  // This is a group session - increment points for the user
  const packagePoints = groupMember.groupSubscription.package.point;
  
  if (packagePoints > 0) {
    await tx.user.update({
      where: { id: groupMember.subscription.member.userId },
      data: {
        point: { increment: packagePoints }
      }
    });
  }
}

// Continue with existing subscription update logic...
const updatedSubscription = await tx.subscription.update({
  where: {
    id: subscription.id,
  },
  data: {
    remainingSessions: {
      decrement: 1,
    },
  },
});
```

#### Booking Group Sessions (New functionality)
```typescript
async function bookGroupSession(groupSubscriptionId: string, sessionData: SessionData) {
  // Get all active group members
  const groupMembers = await prisma.groupMember.findMany({
    where: { 
      groupSubscriptionId,
      status: "ACTIVE"
    },
    include: { 
      subscription: {
        include: {
          member: {
            include: {
              user: true
            }
          }
        }
      },
      groupSubscription: {
        include: { package: true }
      }
    }
  });

  // Use existing session creation logic for each member
  const sessions = await Promise.all(
    groupMembers.map(async (member) => {
      // Call the existing create method for each member
      return await ctx.db.$transaction(async (tx) => {
        // Create session using existing logic
        const session = await tx.trainerSession.create({
          data: {
            trainerId: sessionData.trainerId,
            memberId: member.subscription.memberId,
            date: sessionData.date,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
            description: `Group Session: ${sessionData.description}`,
            status: "NOT_YET"
          }
        });

        // Decrement remaining sessions
        await tx.subscription.update({
          where: { id: member.subscriptionId },
          data: { remainingSessions: { decrement: 1 } }
        });

        // Increment points for the user (not membership)
        const packagePoints = member.groupSubscription.package.point;
        if (packagePoints > 0) {
          await tx.user.update({
            where: { id: member.subscription.member.userId },
            data: {
              point: { increment: packagePoints }
            }
          });
        }

        return session;
      });
    })
  );

  return sessions;
}
```

#### Getting Group Sessions
```typescript
async function getGroupSessions(groupSubscriptionId: string) {
  const groupMembers = await prisma.groupMember.findMany({
    where: { 
      groupSubscriptionId,
      status: "ACTIVE"
    },
    include: { 
      subscription: {
        include: {
          member: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  // Get sessions for all group members
  const sessions = await prisma.trainerSession.findMany({
    where: {
      memberId: { in: groupMembers.map(m => m.subscription.memberId) }
    },
    include: {
      trainer: true,
      member: {
        include: { user: true }
      }
    },
    orderBy: { date: 'desc' }
  });

  // Group sessions by date/time (same session for multiple members)
  const groupedSessions = sessions.reduce((acc, session) => {
    const key = `${session.date}_${session.startTime}_${session.trainerId}`;
    if (!acc[key]) {
      <<<<<<< HEAD
      acc[key] = {
        ...session,
        attendees: []
      };
    }
    acc[key].attendees.push(session.member);
    return acc;
  }, {});

  return Object.values(groupedSessions);
}
```

## 4. API Endpoints

### tRPC Routes
```typescript
export const packageRouter = createTRPCRouter({
  // Existing routes...

  // Group package routes
  createGroupSubscription: protectedProcedure
    .input(z.object({
      packageId: z.string(),
      groupName: z.string().optional(),
      inviteEmails: z.array(z.string().email()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation as shown in section 3
    }),

  inviteToGroup: protectedProcedure
    .input(z.object({
      groupSubscriptionId: z.string(),
      inviteEmails: z.array(z.string().email())
    }))
    .mutation(async ({ ctx, input }) => {
      // Send invitations
    }),

  acceptGroupInvitation: protectedProcedure
    .input(z.object({
      groupSubscriptionId: z.string(),
      invitationToken: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Accept invitation and create subscription
    }),

  getMyGroups: protectedProcedure
    .query(async ({ ctx }) => {
      // Get user's group subscriptions
      const member = await ctx.db.membership.findFirst({
        where: { userId: ctx.session.user.id }
      });
      
      if (!member) return [];
      
      const groupMembers = await ctx.db.groupMember.findMany({
        where: {
          subscription: { memberId: member.id },
          status: "ACTIVE"
        },
        include: {
          groupSubscription: {
            include: {
              package: true,
              leadSubscription: {
                include: {
                  member: {
                    include: { user: true }
                  }
                }
              }
            }
          }
        }
      });
      
      return groupMembers;
    }),

  bookGroupSession: protectedProcedure
    .input(z.object({
      groupSubscriptionId: z.string(),
      trainerId: z.string(),
      date: z.date(),
      startTime: z.date(),
      endTime: z.date(),
      description: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Use the bookGroupSession function from section 3
      return bookGroupSession(input.groupSubscriptionId, {
        trainerId: input.trainerId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        description: input.description
      });
    }),

  getGroupSessions: protectedProcedure
    .input(z.object({ groupSubscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get group sessions as shown in section 3
    })
});

// Modification to existing trainerSessionRouter
export const trainerSessionRouter = createTRPCRouter({
  // Keep all existing methods as they are...
  
  // Only modify the create method to add point increment
  create: permissionProtectedProcedure(["create:session"])
    .input(
      z.object({
        memberId: z.string(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Keep all existing logic exactly the same...
      // Just add point increment logic in the transaction
      
      return ctx.db.$transaction(async (tx) => {
        // Existing session creation logic
        const session = await tx.trainerSession.create({
          data: {
            trainerId: trainer.id,
            memberId: input.memberId,
            date: input.date,
            startTime: input.startTime,
            endTime: input.endTime,
            description: input.description,
          },
        });

        // NEW: Check if this member is part of a group subscription
        const groupMember = await tx.groupMember.findFirst({
          where: {
            subscription: {
              memberId: input.memberId,
              trainerId: trainer.id,
            },
            status: "ACTIVE"
          },
          include: {
            groupSubscription: {
              include: {
                package: true
              }
            },
            subscription: {
              include: {
                member: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        });

        // NEW: Increment points on User if it's a group session
        if (groupMember && groupMember.groupSubscription.package.point > 0) {
          await tx.user.update({
            where: { id: groupMember.subscription.member.userId },
            data: {
              point: { increment: groupMember.groupSubscription.package.point }
            }
          });
        }

        // Existing subscription update logic
        const updatedSubscription = await tx.subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            remainingSessions: {
              decrement: 1,
            },
          },
        });

        return session;
      });
    }),
    
  // Keep all other existing methods unchanged...
});
```

## 5. Key Changes from Original Implementation

### 1. **Points System**
- Updated all queries to include the necessary joins to access the user through the membership relation
- Modified the transaction logic to update the correct user record

### 2. **Enhanced Query Includes**
```typescript
// Updated to include user relation
include: {
  subscription: {
    include: {
      member: {
        include: {
          user: true  // This is now required for point updates
        }
      }
    }
  }
}
```

### 3. **Point Updates**
```typescript

// Now update user.point
await tx.user.update({
  where: { id: groupMember.subscription.member.userId },
  data: { point: { increment: packagePoints } }
});
```

## 6. Example Implementation Flow

1. **Group Package Creation**: Admin creates a group package with points
2. **User Purchase**: Lead user purchases and creates group subscription
3. **Group Formation**: Other users accept invitations and join the group
4. **Session Booking**: When group sessions are booked, each member gets a session
5. **Point Increment**: After each session, the user's points are incremented based on the package's point value

This updated implementation ensures that points are properly tracked on the `User` model while maintaining all other functionality for group package management.