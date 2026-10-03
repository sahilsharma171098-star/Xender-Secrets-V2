# Xender Secrets storage architecture

## Goal

Keep the public site fast while allowing accounts, orders, community posts, comments, likes and article engagement to grow without putting every record into one database instance.

## Current layout

### AppState Durable Object
One strongly-consistent SQLite-backed object stores low-volume transactional data:
- user accounts and password hashes
- server sessions
- product catalog
- orders and order items
- enquiries
- bookings
- project tasks

### CommunityIndex Durable Objects
Community feed metadata is split by topic. Each topic (general, webdev, ecommerce, AI, business, books) gets its own Durable Object. These objects store only compact post metadata and engagement counters used to build feeds.

### ContentThread Durable Objects
Every community post gets its own SQLite-backed Durable Object. Comments, likes, reports, post text and view counts are isolated per post. Article engagement uses the same pattern with one object per article.

This avoids a single giant community database and spreads high-engagement traffic horizontally across many Durable Objects.

## Media strategy

Community is text-first for now. Images, PDFs, video or large user uploads should not be placed in SQLite. Add an R2 bucket for media and store only object keys/metadata in the relevant ContentThread.

## Growth path

1. Current: category-sharded feed indexes + one object per discussion/article.
2. Higher traffic: shard each category index by time or hash (for example, ecommerce-00 through ecommerce-15).
3. Media growth: use R2 with upload-size and content-type validation.
4. Search growth: maintain a search/index service separately from transactional thread storage.
5. Moderation: add admin review queues, automated spam controls and retention policies.

## Data minimization

Do not store data that is not needed. Passwords are stored only as one-way derived hashes, sessions are stored as hashes of random tokens, and community UI should discourage users from posting private personal information.
