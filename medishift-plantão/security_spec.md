# Security Specification - Plantão Express

## Data Invariants
1. A Handover MUST be linked to a valid `patientId`.
2. A Handover MUST record the `professionalUid` of the person creating it, matching their `request.auth.uid`.
3. Patients can only be managed (created/updated/deleted) by Admins.
4. Handovers are immutable after creation (only Read and Create allowed for nursing staff).
5. All IDs must be valid strings.

## The Dirty Dozen Payloads (Potential Attacks)
1. **Self-Promotion**: An authenticated user trying to create a patient doc (should be admin only).
2. **Identity Spoofing**: User A trying to create a handover with `professionalUid` of User B.
3. **Orphaned Handover**: Creating a handover for a non-existent patient ID.
4. **Data Corruption**: Sending a string for `hadEvacuation` boolean field.
5. **Time Travel**: Providing a manual `createdAt` timestamp from the client for a handover.
6. **Mass PII Access**: A user listing all patients including those they shouldn't see (if privacy was enabled, but here visibility is generally allowed for staff).
7. **Resource Exhaustion**: Sending a 1MB string in `observations`.
8. **Malicious ID**: Creating doc with ID `../../secrets`.
9. **Update Hijack**: Trying to update an existing handover record (Handovers should be immutable).
10. **State Corruption**: Deleting a patient record as a regular user.
11. **Shadow Fields**: Adding `isVerified: true` to a patient document.
12. **Query Scraping**: Attempting to list all handovers without proper filters (if restricted, though here history is shared).

## The Test Runner (firestore.rules.test.ts)
(Logic to be implemented in the app or separately if testing tools were available, but I will simulate the logic in my head to harden rules).
