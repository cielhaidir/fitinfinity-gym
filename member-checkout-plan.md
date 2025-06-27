# Member Checkout Plan (Multiple Sessions per Day, Points Once per Day)

## 1. Database Changes

- **Add `checkout DateTime?`** to [`AttendanceMember`](prisma/schema.prisma:528).
- **Remove any unique constraint** on (memberId, checkin) to allow multiple records per day.

```mermaid
erDiagram
    Membership ||--o{ AttendanceMember : has
    AttendanceMember {
        String id PK
        String memberId FK
        DateTime checkin
        DateTime? checkout
        String? facilityDescription
    }
```

---

## 2. Backend API

- **Add `manualCheckout` mutation** in [`esp32.ts`](src/server/api/routers/esp32.ts:381) to set `checkout` for a given attendance record.
- **Update check-in logic** to:
  - Allow multiple check-ins per day.
  - Only increment points for the first check-in per day (check if a record exists for that day before incrementing).
- **Update `getMemberCheckinLogs`** to return all check-in/out records and include a computed `status` ("Checked In" if `checkout` is null, "Checked Out" otherwise).

---

## 3. Frontend

- In [`page.tsx`](src/app/(authenticated)/admin/checkin-logs/page.tsx:31):
  - Show all check-in/out records.
  - Add "Checkout" button for records without `checkout`.
  - Add "Status" and "Checkout Time" columns.

---

## 4. Migration & Testing

- Create and run a Prisma migration.
- Test backend and frontend for multiple check-ins/checkouts per day.
- Verify points only increment once per day.