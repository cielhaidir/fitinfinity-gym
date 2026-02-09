# tRPC API Endpoints Documentation

## Summary

**Total Routers**: 52  
**Total Endpoints**: 300+  
**Total Mutations**: ~150  
**Total Queries**: ~150

This document provides a comprehensive overview of all tRPC API endpoints organized by router. Each endpoint is classified as either a **query** (read operation) or **mutation** (write operation).

---

## Table of Contents

1. [Post Router](#post-router)
2. [Email Router](#email-router)
3. [User Router](#user-router)
4. [Auth Router](#auth-router)
5. [Member Router](#member-router)
6. [Personal Trainer Router](#personal-trainer-router)
7. [Permission Router](#permission-router)
8. [Package Router](#package-router)
9. [Subscription Router](#subscription-router)
10. [Subscription Import Router](#subscription-import-router)
11. [Role Router](#role-router)
12. [Role Permission Router](#role-permission-router)
13. [Class Router](#class-router)
14. [Class Type Router](#class-type-router)
15. [Member Class Router](#member-class-router)
16. [Member UC Router](#member-uc-router)
17. [Trainer Session Router](#trainer-session-router)
18. [Voucher Router](#voucher-router)
19. [Reward Router](#reward-router)
20. [Member Reward Router](#member-reward-router)
21. [Employee Router](#employee-router)
22. [Attendance Router](#attendance-router)
23. [Profile Router](#profile-router)
24. [Member Calendar Router](#member-calendar-router)
25. [Manager Calendar Router](#manager-calendar-router)
26. [Balance Account Router](#balance-account-router)
27. [Chart Account Router](#chart-account-router)
28. [Payment Validation Router](#payment-validation-router)
29. [Transaction Router](#transaction-router)
30. [WhatsApp Router](#whatsapp-router)
31. [FC (Fitness Consultant) Router](#fc-fitness-consultant-router)
32. [Payment Router](#payment-router)
33. [Config Router](#config-router)
34. [FC Member Router](#fc-member-router)
35. [ESP32 Router](#esp32-router)
36. [Device Router](#device-router)
37. [POS Category Router](#pos-category-router)
38. [POS Item Router](#pos-item-router)
39. [POS Sale Router](#pos-sale-router)
40. [MQTT Router](#mqtt-router)
41. [Tracking Router](#tracking-router)
42. [Sales Report Router](#sales-report-router)
43. [Cash Bank Report Router](#cash-bank-report-router)
44. [AI Rate Limit Router](#ai-rate-limit-router)
45. [Finance Router](#finance-router)
46. [Logs Router](#logs-router)
47. [Supplier Router](#supplier-router)
48. [Inventory Router](#inventory-router)
49. [Purchase Order Router](#purchase-order-router)
50. [Reports Router](#reports-router)
51. [Freeze Price Router](#freeze-price-router)
52. [PT (Personal Training) Router](#pt-personal-training-router)

---

## Post Router

### Queries
- **hello** - Returns a greeting message with provided text input
- **getLatest** - Retrieves the most recent post from the database
- **getSecretMessage** - Returns a secret message for authenticated users

---

## Email Router

### Queries
- **listConfigs** - Lists all email configurations
- **getConfig** - Retrieves a specific email configuration by ID
- **listTemplates** - Lists all email templates
- **getTemplate** - Retrieves a specific email template by ID

### Mutations
- **createConfig** - Creates a new email configuration
- **updateConfig** - Updates an existing email configuration
- **deleteConfig** - Deletes an email configuration
- **createTemplate** - Creates a new email template
- **updateTemplate** - Updates an existing email template
- **deleteTemplate** - Deletes an email template
- **sendEmail** - Sends an email using configured settings and template

---

## User Router

### Queries
- **read** - Retrieves a specific user by ID
- **all** - Lists all users with pagination
- **list** - Lists users with filtering and search capabilities
- **getUserWithRoles** - Gets current authenticated user with their roles
- **getById** - Retrieves user details by ID
- **search** - Searches users by query string

### Mutations
- **create** - Creates a new user with roles and permissions
- **update** - Updates user information including roles
- **delete** - Deletes a user by ID

---

## Auth Router

### Queries
- **verifyResetToken** - Verifies if a password reset token is valid

### Mutations
- **resetPassword** - Resets user password using valid token

---

## Member Router

### Queries
- **read** - Retrieves member details by ID
- **list** - Lists members with pagination and filtering
- **getById** - Gets member by ID with subscription info
- **search** - Searches members by query
- **getMembership** - Gets membership details for current user
- **getByCode** - Retrieves member by unique code
- **getAll** - Lists all members
- **getAllActive** - Lists all active members
- **getVouchers** - Gets available vouchers for a member
- **getRewards** - Gets available rewards for a member

### Mutations
- **create** - Creates a new member record
- **update** - Updates member information
- **assignVoucher** - Assigns a voucher to a member
- **delete** - Deletes a member
- **importMembers** - Bulk imports members from data

---

## Personal Trainer Router

### Queries
- **read** - Retrieves personal trainer details by ID
- **list** - Lists trainers with pagination
- **listAll** - Lists all active trainers
- **getTrainerMembers** - Gets all members assigned to a trainer
- **getMembers** - Gets members for current authenticated trainer
- **getMemberDetails** - Gets detailed member information
- **getActiveTrainers** - Lists all active trainers (public)

### Mutations
- **create** - Creates a new personal trainer
- **update** - Updates trainer information
- **delete** - Deletes a trainer
- **assignMembers** - Assigns members to a trainer
- **updateSessions** - Updates trainer session records

---

## Permission Router

### Queries
- **list** - Lists permissions with pagination
- **getAllRoles** - Gets all available roles
- **getById** - Retrieves permission by ID
- **getAll** - Lists all permissions

### Mutations
- **create** - Creates a new permission
- **createBulk** - Creates multiple permissions at once
- **update** - Updates permission details
- **delete** - Deletes a permission

---

## Package Router

### Queries
- **list** - Lists packages with pagination and filtering
- **getById** - Retrieves package details by ID
- **listActive** - Lists all active packages
- **search** - Searches packages
- **getStats** - Gets package statistics
- **getPackageTypes** - Gets available package types
- **getHistory** - Gets package history
- **getComparison** - Compares package features

### Mutations
- **create** - Creates a new membership package
- **update** - Updates package details
- **delete** - Deletes a package
- **activate** - Activates a package
- **deactivate** - Deactivates a package
- **bulkUpdate** - Updates multiple packages
- **duplicate** - Duplicates an existing package

---

## Subscription Router

### Queries
- **getOptions** - Gets subscription options (trainers, FCs)
- **getById** - Retrieves subscription by ID
- **list** - Lists subscriptions with filtering
- **listPending** - Lists pending subscriptions
- **getMemberSubscriptions** - Gets subscriptions for a member
- **getActive** - Gets active subscriptions
- **getExpiring** - Gets expiring subscriptions
- **getStats** - Gets subscription statistics
- **getAllPackages** - Lists all available packages
- **getUpgradeOptions** - Gets upgrade options for subscription
- **search** - Searches subscriptions
- **getHistory** - Gets subscription history
- **getRevenue** - Gets subscription revenue data
- **exportData** - Exports subscription data

### Mutations
- **create** - Creates a new subscription
- **createGroup** - Creates a group subscription
- **update** - Updates subscription details
- **cancel** - Cancels a subscription
- **freeze** - Freezes a subscription
- **unfreeze** - Unfreezes a frozen subscription
- **transfer** - Transfers subscription to another member
- **upgrade** - Upgrades subscription to different package
- **extend** - Extends subscription duration
- **activate** - Activates a subscription
- **bulkUpdate** - Updates multiple subscriptions
- **addSessions** - Adds training sessions to subscription

---

## Subscription Import Router

### Mutations
- **preview** - Previews subscription import data
- **execute** - Executes subscription import operation

---

## Role Router

### Queries
- **read** - Retrieves role by ID
- **list** - Lists roles with pagination
- **getAll** - Gets all roles

### Mutations
- **create** - Creates a new role
- **update** - Updates role information
- **delete** - Deletes a role

---

## Role Permission Router

### Queries
- **list** - Lists role-permission mappings with pagination
- **getRoles** - Gets all roles
- **getPermissions** - Gets all permissions
- **getById** - Retrieves role-permission by ID

### Mutations
- **create** - Creates role-permission mapping
- **update** - Updates role-permission mapping
- **delete** - Deletes role-permission mapping

---

## Class Router

### Queries
- **list** - Lists classes with filtering
- **getUpcoming** - Gets upcoming classes

### Mutations
- **create** - Creates a new class
- **update** - Updates class details
- **delete** - Deletes a class
- **cancel** - Cancels a class

---

## Class Type Router

### Queries
- **getAll** - Lists all class types
- **list** - Lists class types with pagination
- **getById** - Retrieves class type by ID
- **search** - Searches class types

### Mutations
- **create** - Creates a new class type
- **update** - Updates class type
- **delete** - Deletes a class type

---

## Member Class Router

### Queries
- **myClasses** - Gets classes for current member
- **getAttendance** - Gets attendance records
- **exportAttendance** - Exports attendance data

### Mutations
- **register** - Registers member for a class
- **cancel** - Cancels class registration
- **joinWaitlist** - Joins class waitlist
- **removeFromWaitlist** - Removes from waitlist
- **markAttendance** - Marks member attendance
- **bulkRegister** - Registers multiple members

---

## Member UC Router

### Queries
- **getUCMembers** - Gets UC members list
- **getUCDetails** - Gets UC member details

### Mutations
- **createUC** - Creates UC member
- **updateUC** - Updates UC member
- **deleteUC** - Deletes UC member

---

## Trainer Session Router

### Queries
- **list** - Lists trainer sessions
- **getByMember** - Gets sessions by member
- **getByTrainer** - Gets sessions by trainer
- **getStats** - Gets session statistics

### Mutations
- **create** - Creates a trainer session
- **update** - Updates session details
- **delete** - Deletes a session
- **complete** - Marks session as completed
- **cancel** - Cancels a session

---

## Voucher Router

### Queries
- **list** - Lists vouchers with pagination
- **getById** - Retrieves voucher by ID
- **getActive** - Gets active vouchers
- **search** - Searches vouchers

### Mutations
- **create** - Creates a new voucher
- **update** - Updates voucher details
- **delete** - Deletes a voucher
- **activate** - Activates a voucher
- **deactivate** - Deactivates a voucher

---

## Reward Router

### Queries
- **list** - Lists rewards
- **getById** - Retrieves reward by ID
- **getAvailable** - Gets available rewards

### Mutations
- **create** - Creates a new reward
- **update** - Updates reward details
- **delete** - Deletes a reward

---

## Member Reward Router

### Queries
- **getMemberRewards** - Gets rewards for a member
- **getHistory** - Gets reward history

### Mutations
- **claim** - Claims a reward
- **redeem** - Redeems a reward

---

## Employee Router

### Queries
- **list** - Lists employees
- **getById** - Retrieves employee by ID
- **search** - Searches employees

### Mutations
- **create** - Creates a new employee
- **update** - Updates employee details
- **delete** - Deletes an employee

---

## Attendance Router

### Queries
- **list** - Lists attendance records
- **getByMember** - Gets attendance by member
- **getStats** - Gets attendance statistics
- **exportData** - Exports attendance data

### Mutations
- **checkIn** - Records member check-in
- **checkOut** - Records member check-out
- **manualEntry** - Creates manual attendance entry

---

## Profile Router

### Queries
- **get** - Gets current user profile
- **getPreferences** - Gets user preferences

### Mutations
- **update** - Updates profile information
- **updatePreferences** - Updates user preferences
- **changePassword** - Changes user password

---

## Member Calendar Router

### Queries
- **getEvents** - Gets calendar events for member
- **getUpcoming** - Gets upcoming events

---

## Manager Calendar Router

### Queries
- **getEvents** - Gets all calendar events
- **getByDate** - Gets events by date range

### Mutations
- **createEvent** - Creates a calendar event
- **updateEvent** - Updates event
- **deleteEvent** - Deletes an event

---

## Balance Account Router

### Queries
- **list** - Lists balance accounts
- **getById** - Retrieves account by ID
- **getBalance** - Gets current balance

### Mutations
- **create** - Creates a balance account
- **update** - Updates account details
- **delete** - Deletes an account
- **adjustBalance** - Adjusts account balance

---

## Chart Account Router

### Queries
- **list** - Lists chart of accounts
- **getById** - Retrieves account by ID
- **getTree** - Gets account hierarchy tree

### Mutations
- **create** - Creates a chart account
- **update** - Updates account details
- **delete** - Deletes an account

---

## Payment Validation Router

### Queries
- **list** - Lists payment validations
- **getPending** - Gets pending validations

### Mutations
- **validate** - Validates a payment
- **reject** - Rejects a payment
- **approve** - Approves a payment

---

## Transaction Router

### Queries
- **list** - Lists transactions
- **getById** - Retrieves transaction by ID
- **getByMember** - Gets member transactions
- **search** - Searches transactions

### Mutations
- **create** - Creates a transaction
- **update** - Updates transaction
- **void** - Voids a transaction

---

## WhatsApp Router

### Queries
- **getStatus** - Gets WhatsApp service status
- **getTemplates** - Gets message templates

---

## FC (Fitness Consultant) Router

### Queries
- **list** - Lists fitness consultants
- **getById** - Retrieves FC by ID
- **getMembers** - Gets FC's assigned members
- **getStats** - Gets FC statistics

### Mutations
- **create** - Creates a fitness consultant
- **update** - Updates FC details
- **delete** - Deletes an FC
- **assignMembers** - Assigns members to FC

---

## Payment Router

### Queries
- **list** - Lists payments
- **getById** - Retrieves payment by ID
- **getStatus** - Gets payment status
- **getHistory** - Gets payment history

### Mutations
- **create** - Creates a payment
- **process** - Processes a payment
- **refund** - Refunds a payment
- **cancel** - Cancels a payment

---

## Config Router

### Queries
- **get** - Gets configuration settings
- **getAll** - Gets all configurations
- **getByKey** - Gets config by key

### Mutations
- **update** - Updates configuration
- **updateBulk** - Updates multiple configs
- **reset** - Resets config to default

---

## FC Member Router

### Queries
- **list** - Lists FC member relationships
- **getByFC** - Gets members by FC
- **getByMember** - Gets FC for member

### Mutations
- **assign** - Assigns member to FC
- **unassign** - Unassigns member from FC
- **transfer** - Transfers member to different FC

---

## ESP32 Router

### Queries
- **getDevices** - Lists ESP32 devices
- **getStatus** - Gets device status
- **getLogs** - Gets device logs


---

## Device Router

### Queries
- **list** - Lists all devices
- **getById** - Retrieves device by ID
- **getOnline** - Gets online devices

---

## POS Category Router

### Queries
- **list** - Lists POS categories
- **getById** - Retrieves category by ID

### Mutations
- **create** - Creates a category
- **update** - Updates category
- **delete** - Deletes a category

---

## POS Item Router

### Queries
- **list** - Lists POS items
- **getById** - Retrieves item by ID
- **search** - Searches items
- **getByCategory** - Gets items by category

### Mutations
- **create** - Creates a POS item
- **update** - Updates item details
- **delete** - Deletes an item
- **updateStock** - Updates item stock

---

## POS Sale Router

### Queries
- **list** - Lists sales transactions
- **getById** - Retrieves sale by ID
- **getStats** - Gets sales statistics

### Mutations
- **create** - Creates a sale transaction
- **void** - Voids a sale
- **refund** - Processes a refund

---

## MQTT Router

### Queries
- **getStatus** - Gets MQTT broker status
- **getTopics** - Gets subscribed topics
- **getLogs** - Gets MQTT logs

---

## Tracking Router

### Queries
- **list** - Lists tracking records
- **getByMember** - Gets tracking by member
- **getMetrics** - Gets tracking metrics

### Mutations
- **create** - Creates tracking record
- **update** - Updates tracking record
- **delete** - Deletes tracking record

---

## Sales Report Router

### Queries
- **getSummary** - Gets sales summary
- **getDetailed** - Gets detailed sales report
- **getByPeriod** - Gets sales by period
- **exportReport** - Exports sales report

---

## Cash Bank Report Router

### Queries
- **getSummary** - Gets cash/bank summary
- **getTransactions** - Gets cash/bank transactions
- **getBalance** - Gets current balance
- **exportReport** - Exports cash/bank report

---

## AI Rate Limit Router

### Queries
- **getUsage** - Gets AI usage statistics
- **getLimits** - Gets rate limits
- **getRemaining** - Gets remaining quota


---

## Finance Router

### Queries
- **getSummary** - Gets financial summary
- **getReports** - Gets financial reports
- **getMetrics** - Gets financial metrics
- **exportData** - Exports financial data

### Mutations
- **createEntry** - Creates financial entry
- **updateEntry** - Updates financial entry
- **deleteEntry** - Deletes financial entry

---

## Logs Router

### Queries
- **list** - Lists system logs
- **getById** - Retrieves log by ID
- **search** - Searches logs
- **getByType** - Gets logs by type

---

## Supplier Router

### Queries
- **list** - Lists suppliers
- **getById** - Retrieves supplier by ID
- **search** - Searches suppliers

### Mutations
- **create** - Creates a supplier
- **update** - Updates supplier details
- **delete** - Deletes a supplier

---

## Inventory Router

### Queries
- **list** - Lists inventory items
- **getById** - Retrieves item by ID
- **getStock** - Gets stock levels
- **getLowStock** - Gets low stock items

### Mutations
- **create** - Creates inventory item
- **update** - Updates item details
- **delete** - Deletes an item
- **adjustStock** - Adjusts stock levels
- **transfer** - Transfers stock

---

## Purchase Order Router

### Queries
- **list** - Lists purchase orders
- **getById** - Retrieves PO by ID
- **getPending** - Gets pending orders

### Mutations
- **create** - Creates a purchase order
- **update** - Updates PO details
- **approve** - Approves a PO
- **cancel** - Cancels a PO
- **receive** - Receives PO items

---

## Reports Router

### Queries
- **getMemberReport** - Gets member reports
- **getRevenueReport** - Gets revenue reports
- **getAttendanceReport** - Gets attendance reports
- **getSubscriptionReport** - Gets subscription reports
- **getCustomReport** - Gets custom reports
- **exportReport** - Exports report data

---

## Freeze Price Router

### Queries
- **list** - Lists freeze prices
- **getCurrent** - Gets current freeze price

### Mutations
- **create** - Creates freeze price
- **update** - Updates freeze price
- **delete** - Deletes freeze price

---

## PT (Personal Training) Router

### Queries
- **list** - Lists PT sessions
- **getById** - Retrieves PT session by ID
- **getByMember** - Gets member's PT sessions
- **getByTrainer** - Gets trainer's PT sessions

### Mutations
- **create** - Creates PT session
- **update** - Updates PT session
- **delete** - Deletes PT session
- **complete** - Marks session complete

---

## Notes

- **Permission Protection**: Most endpoints use `permissionProtectedProcedure` requiring specific permissions
- **Public Endpoints**: Few endpoints like `publicProcedure` are accessible without authentication
- **Transaction Support**: Many mutations use database transactions for data consistency
- **Pagination**: List queries typically support pagination with limit/offset or cursor-based pagination
- **Filtering**: Most list endpoints support filtering by various criteria
- **Search**: Search endpoints support fuzzy text search across relevant fields

---

**Generated**: 2026-01-31  
**Total Routers Documented**: 52  
**Estimated Total Endpoints**: 300+
