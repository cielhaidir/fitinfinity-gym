## Subscription & Payment Excel Import Specification (Revised)

### 1. Goal
Recover lost subscription, member, and payment data from manually maintained Excel (.xlsx) files by providing an admin import workflow that:
- Parses Excel rows into normalized batches (one member may have multiple packages in same purchase).
- Uses ONLY the first NOMINAL value in a batch (ignore duplicates on subsequent PT rows with same amount).
- Creates placeholder users (name + " BARU") when no ID provided.
- Creates memberships, subscriptions, payments, payment validations (status ACCEPTED) atomically per batch.
- Allocates discount (Disc percent) and total payment proportionally across multi-package purchases.
- Awards points per subscription.
- Supports renewals when ID (existing user.id) is present.
- Enables later transfer of placeholder subscriptions to real logged-in users using [`subscriptionRouter.transfer()`](src/server/api/routers/subscription.ts:1256).
- Maps PAYMENT method to BalanceAccount via [`payment.md`](prompt/payment.md:1).

### 2. Excel Schema (Final)
Headers (case-insensitive):
- TANGGAL (date): Purchase date (primary fallback startDate).
- START (date, optional): Subscription start override else TANGGAL.
- ID (string, optional): existing user.id for renewal.
- NAMA (string): member name (base; placeholder user gets suffix " BARU").
- MEMBERSHIP (START) or MEMBERSHIP column (string): package label exactly matching package.name (e.g. MEMB​ERSHIP 3 BULAN, PT 8 SESI).
- Disc (number percent, optional): discount percent applied ONCE to combined base sum of all packages in batch.
- NOMINAL (number currency, required on anchor row only): total NET after discount for batch. If repeated on subsequent rows with same amount, ignore duplicates.
- PT SESSION (string optional): Either trainer token (e.g. SRI) or format "sessions / TRAINERNAME" (legacy). For current cleaned file often only trainer token present.
- PAYMENT (string): payment method text (e.g. Cash, BNI, MANDIRI, BCA, BRI, CIMB, QR BCA) mapped to balanceAccount.id (via payment.md).
- FC (string): consultant name mapping to fc.id (applies to all rows).

Anchor row:
- First row for member (NAMA) with a NOMINAL value.
Subsequent rows until next anchor (new NOMINAL or different name) belong to batch. Duplicate NOMINAL values inside same batch are ignored.

### 3. Date Parsing Rules
Supported formats:
1. yyyy-MM-dd (sample file uses this often)
2. dd-MMM (e.g. 10-Sep) assume current year.
3. d/M/yy (e.g. 10/9/25) yy < 50 => 20yy else 19yy.
4. dd/MM/yyyy.

Failure => error code E_DATE_FORMAT.
startDate = parsed(START) if valid else parsed(TANGGAL).

Normalize all dates to Asia/Makassar midnight.

### 4. Mapping Tables
From user-provided files:
- Packages: [`package.md`](prompt/package.md:1)
- Trainers: [`pt.md`](prompt/pt.md:1)
- Fitness Consultants: [`fc.md`](prompt/fc.md:1)
- Balance Accounts: PAYMENT mapping [`payment.md`](prompt/payment.md:1) (format: balanceAccountId,MethodName).
Create dictionaries:
```ts
packageByLabel: Record<string,{
  id:string; type:'GYM_MEMBERSHIP'|'PERSONAL_TRAINER';
  sessions?:number; day?:number; price:number; point:number;
}>
trainerByToken: Record<string,{ id:string }>
fcByName: Record<string,{ id:string }>
balanceAccountByMethod: Record<string,{ id:number }>
```
Trim & upper/lower normalize keys.

### 5. Batch Grouping Logic
Algorithm:
1. Iterate sorted sheet rows.
2. If row has NOMINAL (non-empty numeric or currency string) start new batch.
3. Add subsequent rows with same NAMA until next NOMINAL (new anchor) or different NAMA.
4. Record firstNominal = numeric value of initial NOMINAL only.
5. Subsequent NOMINAL duplicates:
   - If equals firstNominal: ignore (warning code E_DUP_NOMINAL_IGNORED optional).
   - If differs: error E_CONFLICT_NOMINAL (block batch).

Compute baseSum = Σ(package.price) (one per row even if NOMINAL absent).
DiscountPercent = Disc (anchor row only, default 0). (If Disc appears later produce warning; ignore).
NetTotal authoritative = firstNominal; recomputedNet = round(baseSum*(1 - discountPercent/100)).
If |recomputedNet - NetTotal| > tolerance (100) => warning E_NET_MISMATCH.

### 6. Discount Allocation
Proportional split:
allocRaw_i = NetTotal * (price_i / baseSum)
Rounding:
- For i=1..n-1: alloc[i] = Math.round(allocRaw_i)
- runningSum = Σ alloc[i]
- alloc[n] = NetTotal - runningSum
If alloc[n] < 0 adjust largest previous alloc downward.
Guarantee Σ alloc[i] == NetTotal.

### 7. Placeholder User & Membership Creation
No ID:
- user.name = NAMA + " BARU"
- email = slugify(NAMA)+"dummy@fitinfinity.id"
- Create User (if not exists).
- Create Membership (isActive=false, registerDate = anchor startDate).
Renewal (ID present):
- userId = ID
- If membership missing create one (isActive=false).

### 8. Subscription Creation
For each batch row:
Use [`subscriptionRouter.create()`](src/server/api/routers/subscription.ts:79) with:
- memberId: membership.userId
- startDate
- packageId
- duration: package.day (gym) or package.sessions (trainer)
- subsType: 'gym' or 'trainer'
- trainerId: trainer token mapping for PT package else null
- salesId: fc.id
- salesType: "FC"
- paymentMethod: PAYMENT text normalized
- totalPayment: alloc[i]
- status: "SUCCESS" (historical paid)
- orderReference: IMPORT-<YYYYMMDD>-<batchSeq>-<rowSeq>

Router creates Payment (lines [`subscriptionRouter.create()`](src/server/api/routers/subscription.ts:165)).

### 9. PaymentValidation Creation
For each subscription created:
Create PaymentValidation record:
- memberId: membership.id
- packageId: packageId
- trainerId: trainerId (if any)
- fcId: fc.id
- subsType: 'gym' or 'trainer'
- duration: package.day (gym) or package.sessions (trainer)
- sessions: package.sessions (trainer) else null
- totalPayment: alloc[i]
- paymentMethod: PAYMENT (normalized)
- paymentStatus: ACCEPTED
- startDate: subscription.startDate
- balanceId: balanceAccountByMethod[PAYMENT]?.id (if exists)
- salesId: fc.id
- salesType: "FC"

### 10. Points Awarding
After subscription + payment + paymentValidation:
Increment user.point by package.point (one increment per subscription). Ensure no double counting; check if awarding already occurred (if router logic auto-awards inside updatePaymentStatus path; for direct create we perform explicit increment).

### 11. Payments & Balance Accounts
Payment (from subscription create) currently lacks balanceId. Balance association stored in PaymentValidation (source of truth for finance). Optionally later backfill Payment with balanceId if required.

### 12. API Endpoints

#### Preview
POST /api/import/subscription/preview
Request:
```json
{ "fileBase64": "..." }
```
Response:
```json
{
  "batches":[
    {
      "batchId":"uuid",
      "memberName":"string",
      "anchorRow": rowNumber,
      "discountPercent": number,
      "netTotal": number,
      "recomputedNet": number,
      "baseSum": number,
      "rows":[
        {
          "rowNumber": number,
          "packageLabel": "string",
          "packageId": "string",
          "packageType": "GYM_MEMBERSHIP|PERSONAL_TRAINER",
          "trainerToken": "SRI|EGI|...",
          "trainerId": "string|null",
          "fcName": "string",
          "fcId": "string",
          "balanceAccountId": number|null,
          "startDate": "ISO",
          "allocation": number,
          "point": number,
          "errors": ["CODE"],
          "warnings": ["CODE"]
        }
      ],
      "errors": ["CODE"],
      "warnings": ["CODE"]
    }
  ],
  "stats":{
    "totalRows": number,
    "totalBatches": number,
    "errorRows": number,
    "warningRows": number
  }
}
```

#### Commit
POST /api/import/subscription/commit
Request:
```json
{ "batchIds": ["uuid", ...] }
```
Process each batch transactional:
- Re-parse cached rows (or send full batch detail from client).
- Validate again (idempotent).
- Create User/Membership if needed.
- Create Subscriptions (and Payments).
- Create PaymentValidations.
- Award points.

Response:
```json
{
  "summary":{
    "usersCreated": number,
    "membershipsCreated": number,
    "subscriptionsCreated": number,
    "paymentsCreated": number,
    "paymentValidationsCreated": number,
    "pointsAwarded": number,
    "batchesProcessed": number,
    "failures": number
  },
  "errors":[
    { "batchId":"uuid","rowNumber":123,"code":"E_xxx","message":"..." }
  ],
  "warnings":[
    { "batchId":"uuid","rowNumber":123,"code":"E_NET_MISMATCH","delta":1000 }
  ]
}
```

### 13. Validation Error Codes
| Code | Description | Level |
| E_REQUIRED | Missing mandatory field | error |
| E_INVALID_PACKAGE | Package label not found | error |
| E_INVALID_TRAINER | Trainer token unresolved | error |
| E_INVALID_FC | FC name unresolved | error |
| E_DATE_FORMAT | Unrecognized date format | error |
| E_MISSING_ANCHOR_NOMINAL | Anchor row lacks NOMINAL | error |
| E_CONFLICT_NOMINAL | Subsequent NOMINAL differs from firstNominal | error |
| E_DUP_NOMINAL_IGNORED | Duplicate NOMINAL identical to anchor ignored | warning |
| E_NET_MISMATCH | Computed net differs from provided NOMINAL beyond tolerance | warning |
| E_NEGATIVE_ALLOCATION | Allocation <= 0 after rounding | error |
| E_DUPLICATE_SUBSCRIPTION | Existing same member+package+startDate found | warning |
| E_INVALID_PAYMENT_METHOD | PAYMENT method not mapped | warning |

### 14. Idempotency
- Deterministic orderReference per row.
- Before create check existing subscription (memberId, packageId, startDate). If exists append warning E_DUPLICATE_SUBSCRIPTION and skip creation.
- If Payment with same orderReference exists skip payment creation and still attempt PaymentValidation (if absent).

### 15. Security
Restrict endpoints to permissions:
- preview: list:subscription
- commit: create:subscription
Validate file size (e.g. < 2MB) and row count (<= 2000).

### 16. Rounding Strategy
See section 6. Guarantee integer sum equals NetTotal; adjust last element for remainder.

### 17. Frontend Components
Route: /management/subscription/import
Panels:
1. Upload (drag-drop).
2. Parsed Preview (accordion per batch).
3. Batch Summary (baseSum, discount%, netTotal, recomputedNet).
4. Error/Warning badges.
5. Balance account mapping column.
6. Approve / exclude toggles.
7. Commit action (disabled until no batch has error).
8. Result modal with stats and error CSV download.

### 18. State Types
```ts
type ParsedRow = {
  rowNumber: number;
  nama: string;
  packageLabel: string;
  packageId?: string;
  packageType?: 'GYM_MEMBERSHIP'|'PERSONAL_TRAINER';
  trainerToken?: string;
  trainerId?: string;
  fcName: string;
  fcId?: string;
  balanceAccountId?: number;
  startDate?: Date;
  allocation?: number;
  point?: number;
  errors: string[];
  warnings: string[];
};

type Batch = {
  batchId: string;
  memberName: string;
  anchorRow: number;
  discountPercent: number;
  baseSum: number;
  netTotal: number;
  recomputedNet: number;
  rows: ParsedRow[];
  errors: string[];
  warnings: string[];
};
```

### 19. Transaction Boundaries
One DB transaction per batch:
- Creates all entities.
- Rolls back entirely if any row error arises after validation (e.g. unexpected DB constraint).
- Continues other batches.

### 20. Workflow (Mermaid Revised)
```mermaid
graph TD
A[Upload xlsx] --> B[Parse rows]
B --> C[Group batches & first NOMINAL capture]
C --> D[Resolve package/trainer/fc/payment mappings]
D --> E[Compute discount & allocations]
E --> F[Validate rules]
F --> G{Errors?}
G -->|Yes| H[Show preview with errors/warnings]
H --> I[User excludes bad batches]
G -->|No| J[Enable Commit]
J --> K[Commit Endpoint]
K --> L[Tx: User/Membership creation]
L --> M[Create Subscriptions + Payments]
M --> N[Create PaymentValidations (ACCEPTED)]
N --> O[Award Points]
O --> P[Idempotency Checks]
P --> Q[Summary + CSV]
Q --> R[Optional Transfer Later]
```

### 21. Risks & Mitigations
| Risk | Mitigation |
| Incorrect duplicate NOMINAL handling | Explicit firstNominal capture + conflict check. |
| Payment method unmapped | Warning E_INVALID_PAYMENT_METHOD; still proceed with balanceAccountId null. |
| Performance with large file | Row cap, streaming parse. |
| Partial failure | Transaction per batch. |
| Over-awarding points | Check duplication before awarding. |

### 22. Future Enhancements
- Batch-level consolidated Payment record (optional).
- Automatic linking Payment.balanceId.
- Placeholder user merge flow UI.

### 23. Acceptance Criteria
- Duplicate NOMINAL rows ignored without altering allocation.
- PaymentValidation records exist for every created subscription with correct balanceId.
- Points awarded equal Σ package.point of newly created subscriptions.
- Batches partially failing do not create orphan data.
- Warning codes surfaced clearly.

### 24. Implementation Order (Updated)
1. Parser & grouping (first NOMINAL logic).
2. Mapping loaders (package/trainer/fc/payment).
3. Allocation & discount module.
4. Validation module (error/warning codes).
5. Preview endpoint.
6. Frontend preview UI.
7. Commit endpoint (transactional creation + PaymentValidation).
8. Points awarding & idempotency.
9. Error CSV generator.
10. Tests (unit + integration).
11. Transfer support (already exists).
12. Summary UI.
