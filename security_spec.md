# Security Specification

## Data Invariants
1. A room can only be created by an authenticated user.
2. A member can only exist in a room if the user is authenticated.
3. A message can only be posted in a room if the user is a member of that room.
4. Users can only manage their own watchlist.

## The "Dirty Dozen" Payloads (Testing scenarios)
1. Creating a room with a fake `movieId` or invalid hostId.
2. An unauthenticated user creating a room.
3. An unauthenticated user joining a room.
4. An unauthenticated user sending a message.
5. User A trying to update User B's watchlist.
6. A user trying to set their own `hostId` to someone else's UID.
7. Injecting massive strings (1MB) into `text` field.
8. Injecting invalid data types (numbers instead of strings).
9. Updating `createdAt` or `hostId` fields.
10. Attempting to delete a room without permissions.
11. Reading another user's private watchlist.
12. Attempting to write to a room that doesn't exist.

## The Test Runner (firestore.rules.test.ts)
*(To be implemented)*
