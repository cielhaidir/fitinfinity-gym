# Plan: Admin UI to Register Member to Class (Active Subscription Only)

## 1. Location
- Add a new admin page or dialog for class registration.

## 2. UI Components
- **Class Selector:** Dropdown or searchable list to select a class.
- **Member Selector:** Dropdown or searchable list to select a member (only show members with active subscriptions).
- **Register Button:** Triggers registration via the backend.
- **Feedback/Toast:** Show success or error messages.

```mermaid
flowchart TD
    A[Admin opens Register Member UI] --> B[Select Class]
    B --> C[Select Member (active subscription only)]
    C --> D[Click Register]
    D --> E[Call adminAddMember API]
    E --> F[Show Success/Error]
```

## 3. Data Fetching
- **Classes:** Fetch upcoming classes (reuse existing API).
- **Members:** Fetch members with active subscriptions only (filter in backend).

## 4. API Integration
- Use the new `adminAddMember` mutation ([`memberClassRouter`](src/server/api/routers/memberClass.ts:217)).
- Pass selected `classId` and `memberId`.

## 5. Validation
- Disable register button if no class/member selected.
- Handle errors (already registered, class full, etc).

## 6. Optional Enhancements
- Search/filter for classes and members.
- Show class details and member subscription status inline.