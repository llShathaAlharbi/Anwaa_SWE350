# Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: All paths not explicitly matched are denied for both read and write.
2. **Strict Ownership**: A user can only read, create, update, or delete their own favorites document where `uid == request.auth.uid`.
3. **Path Variable Hardening**: Path parameters `uid` and `docId` must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
4. **Schema Enforcement**: Every write must contain only `['uid', 'favorites', 'updatedAt']`, where `uid == request.auth.uid`, `favorites` is a list of size <= 40 (and if non-empty, element 0 is an `int`), and `updatedAt == request.time`.
5. **No Blanket List Reads**: `list` operations on `/users` are denied; users only fetch their own document by ID.

## 2. The "Dirty Dozen" Payloads
1. Unauthenticated read on `/users/user_1` -> `PERMISSION_DENIED`
2. Authenticated read by `user_2` on `/users/user_1` -> `PERMISSION_DENIED`
3. Shadow field injection: `{ uid: 'user_1', favorites: [1], updatedAt: request.time, isAdmin: true }` -> `PERMISSION_DENIED`
4. Identity spoofing in body: `user_1` writing `{ uid: 'user_2', favorites: [1], updatedAt: request.time }` to `/users/user_1` -> `PERMISSION_DENIED`
5. Cross-user write: `user_1` writing to `/users/user_2` -> `PERMISSION_DENIED`
6. Oversized array: `favorites` array with 41 items -> `PERMISSION_DENIED`
7. Invalid array element type: `favorites: ["not_an_int"]` -> `PERMISSION_DENIED`
8. Spoofed timestamp: `updatedAt` set to past/future client timestamp instead of `request.time` -> `PERMISSION_DENIED`
9. Missing required field: `{ uid: 'user_1', favorites: [1] }` (missing `updatedAt`) -> `PERMISSION_DENIED`
10. ID poisoning: `uid` with >128 chars or invalid characters -> `PERMISSION_DENIED`
11. Unbounded collection list query on `/users` -> `PERMISSION_DENIED`
12. Mutating `uid` on update to another user's ID -> `PERMISSION_DENIED`
