
# QuickNotes System Architecture

## 1. Overview

QuickNotes is a cloud-based note-taking application designed to support 1 million registered users.

Users can create, read, update, delete, search, and organize notes. The proposed architecture focuses on security, scalability, reliability, and performance.

This document describes the planned production architecture. The current JavaScript prototype uses JSONPlaceholder to simulate API requests; it does not implement the production backend described here.

## 2. Functional Requirements

The system must support:

1. User registration and login.
2. Creating new notes.
3. Viewing and searching notes.
4. Updating existing notes.
5. Deleting notes.
6. Organizing notes using tags.
7. Restricting access to the authenticated user's data.
8. Listing notes with pagination.

## 3. Non-Functional Requirements

- **Availability:** Target 99.9% uptime.
- **Performance:** Target API response times below 300 ms at the 95th percentile under normal operating conditions.
- **Scalability:** Support growth beyond 1 million registered users.
- **Security:** Use HTTPS, authentication, authorization, and input validation.
- **Reliability:** Use replication, backups, and recovery procedures.
- **Maintainability:** Separate the frontend, API, database, and background processing.
- **Observability:** Collect logs, metrics, and alerts.

These are engineering targets, not measured performance guarantees.

## 4. Load and Storage Estimates

### Assumptions

- Registered users: 1,000,000
- Daily active users: 20% = 200,000
- Reads per active user per day: 20
- Creates or updates per active user per day: 2
- Average note size: 2 KB
- Seconds per day: 86,400
- Peak traffic multiplier: 5
- Days per year: 365

### Reads per Day

200,000 × 20 = 4,000,000 reads/day

Average reads per second:

4,000,000 / 86,400 ≈ 46 reads/second

Peak reads per second:

46 × 5 ≈ 230 reads/second

### Writes per Day

200,000 × 2 = 400,000 writes/day

Average writes per second:

400,000 / 86,400 ≈ 4.6 writes/second

Peak writes per second:

4.6 × 5 ≈ 23 writes/second

### Storage per Year

400,000 × 2 KB = 800,000 KB/day

800,000 KB × 365 = 292,000,000 KB/year

Approximately 292 GB/year of new note data, using decimal units.

This simplified upper-bound estimate assumes every write creates a new note. Updates may not increase storage by the full note size.

It excludes indexes, metadata, replication, backups, and logs.

### Summary

| Metric | Estimate |
|---|---|
| Registered users | 1,000,000 |
| Daily active users | 200,000 |
| Average reads/sec | 46 |
| Peak reads/sec | 230 |
| Average writes/sec | 4.6 |
| Peak writes/sec | 23 |
| New note storage/year | 292 GB |

The estimated workload is read-heavy, with approximately 10 reads for every write.

## 5. Architecture Diagram

```text
                  +----------------------+
                  | Web / Mobile Client  |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  |         DNS          |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  | CDN / Static Assets  |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  |  HA Load Balancer    |
                  +----------+-----------+
                             |
                  +----------+----------+
                  |                     |
                  v                     v
           +-------------+       +-------------+
           | App Server 1|       | App Server 2|
           |   Zone A    |       |   Zone B    |
           +------+------+       +------+------+
                  |                     |
                  +----------+----------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
        +-----------+  +-----------+  +-----------+
        |   Redis   |  | Primary DB|  | Message   |
        |   Cache   |  | PostgreSQL|  | Queue     |
        +-----------+  +-----+-----+  +-----+-----+
                             |              |
                  +----------+-----+        v
                  |                |   +-----------+
                  v                v   |Background |
            +-----------+    +-----------+ Worker |
            | Read      |    | Standby   |+----------+
            | Replica   |    | Database  |
            +-----------+    +-----------+
```

The diagram shows the main logical components. Production deployment also requires redundant load-balancing infrastructure, cache nodes, queue brokers, workers, and database failover orchestration.

The primary database handles authoritative writes. Read replicas may serve suitable read-only queries, while standby database infrastructure supports recovery from primary failure.

## 6. Component Explanations

1. **Client:** Provides the interface for creating, viewing, and managing notes.
2. **DNS:** Resolves the application's domain name.
3. **CDN:** Delivers static frontend files efficiently.
4. **Load Balancer:** Distributes requests across healthy application servers.
5. **Application Servers:** Authenticate requests, validate input, and execute business logic.
6. **Redis Cache:** Stores frequently requested data to reduce database load.
7. **Primary PostgreSQL Database:** Stores authoritative users, notes, tags, and relationships.
8. **Read Replica:** Serves eligible read-only queries and reduces primary database load.
9. **Standby Database:** Can be promoted when the primary fails, subject to failover configuration.
10. **Message Queue:** Holds asynchronous background tasks.
11. **Background Workers:** Process notifications, search indexing, and maintenance jobs.

## 7. GET /notes Request Flow

1. The user opens QuickNotes in a browser.
2. DNS resolves the application domain.
3. The CDN delivers the frontend files.
4. The browser sends an authenticated `GET /notes` request.
5. The load balancer forwards the request to a healthy application server.
6. The application server validates the access token and identifies the user.
7. The server checks Redis for cached notes belonging to that user.
8. If a valid cache entry exists, the server returns the cached result.
9. If the cache misses, the server queries PostgreSQL, potentially using a read replica.
10. The database query filters by authenticated user ID and applies pagination.
11. The server may cache the result with a short expiration time.
12. The API returns HTTP `200 OK` with JSON data.
13. The browser displays the notes or an empty-state message.

Sensitive notes must be cached using user-specific keys and appropriate access controls.

If a read replica is unavailable, the application can temporarily route eligible reads to the primary database, provided the primary has sufficient capacity.

## 8. POST /notes Request Flow

Creating a note is a state-changing operation, so it must be committed to the primary database before the API confirms success.

### Step-by-Step Flow

1. The user enters a title and optional note body.
2. The browser validates the title, including the 100-character limit.
3. The browser sends `POST /notes` with JSON and an authentication token.
4. The load balancer forwards the request to a healthy application server.
5. The application server authenticates the user and determines their user ID.
6. The server validates the submitted data and enforces authorization rules.
7. The server begins a PostgreSQL transaction.
8. The server inserts the new note into the primary database.
9. The database generates the note ID and commits the transaction.
10. The server invalidates or updates the user's affected Redis cache entries.
11. A background event is delivered to the message queue for tasks such as search indexing or notifications.
12. A background worker processes the queued task, retrying temporary failures.
13. The API returns HTTP `201 Created` with the saved note and generated ID.
14. The browser displays the newly created note and a success message.

### Reliable Message Queue Processing

The message queue does not replace the primary database as the authoritative storage for notes.

A transactional outbox pattern can be used to prevent lost background events:

1. Insert the note and an outbox event in the same database transaction.
2. Commit both records atomically.
3. An outbox publisher reads pending events.
4. The publisher sends events to the durable message queue.
5. The queue delivers events to available background workers.
6. Workers process events and acknowledge successful completion.
7. Failed events are retried, and repeatedly failing events can enter a dead-letter queue.

Workers should be idempotent so that repeated delivery does not create duplicate side effects.

The API can return success once the note is durably committed, even if optional background indexing has not yet completed. Cache invalidation failures must be handled so that stale entries do not remain indefinitely.

## 9. Architecture Trade-offs

### Trade-off 1: Caching vs Data Freshness

**Benefit:** Redis reduces database reads and improves response times.

**Drawback:** Cached notes may become stale after a create, update, or delete operation.

**Mitigation:** Invalidate affected cache entries after writes, use short expiration times, and route consistency-sensitive requests to the primary database.

### Trade-off 2: Read Replicas vs Consistency

**Benefit:** Read replicas increase read capacity and reduce load on the primary database.

**Drawback:** Replication lag may cause users to see outdated data immediately after a write.

**Mitigation:** Route read-after-write requests to the primary when immediate consistency is required, and monitor replication lag.

### Trade-off 3: Message Queues vs Operational Complexity

**Benefit:** Background processing keeps slow tasks outside user-facing requests.

**Drawback:** Message queues introduce more infrastructure, delayed processing, and possible duplicate deliveries.

**Mitigation:** Use durable queues, transactional outbox publishing, retries, idempotent workers, and dead-letter queues.

### Trade-off 4: Multiple Servers vs Infrastructure Cost

**Benefit:** Multiple application servers improve availability and enable horizontal scaling.

**Drawback:** Additional servers increase infrastructure and operational expenses.

**Mitigation:** Use autoscaling, resource monitoring, and capacity planning.

## 10. Avoiding Single Points of Failure

A single point of failure is a component whose failure could make the entire service unavailable.

QuickNotes should use redundancy and recovery procedures for critical components.

### Application Server Failure

- Run at least two application servers across separate availability zones.
- Configure load-balancer health checks.
- Stop routing traffic to unhealthy servers.
- Route new requests to healthy servers.
- Automatically replace failed instances where supported.

The application servers should remain stateless so requests can be handled by any healthy instance.

### Read Replica Failure

- Monitor replica health and replication lag.
- Remove unhealthy replicas from the read-routing pool.
- Route suitable reads to another healthy replica or temporarily to the primary database.
- Rebuild or replace failed replicas.

A read replica failure should not stop database writes because writes continue through the primary.

### Primary Database Failure

- Maintain a standby database with suitable replication.
- Detect primary failure using database health monitoring.
- Use failover orchestration to promote an eligible standby.
- Update database routing so application servers connect to the new primary.
- Prevent the old primary from accepting writes during recovery to avoid split-brain behavior.
- Restore replication after the failed node is repaired.

Automatic failover depends on the database deployment and its configuration. Asynchronous replication can result in data loss during some failure scenarios.

### Redis Failure

- Configure Redis replication and failover where appropriate.
- Allow application servers to bypass Redis and query PostgreSQL if the cache is unavailable.
- Apply rate limits and capacity protections to avoid overwhelming the database.

### Message Queue Failure

- Use redundant queue brokers with durable message storage.
- Retain pending outbox events until successful publication.
- Restart or replace failed workers.
- Retry temporary failures and isolate repeatedly failing messages in a dead-letter queue.

Core note creation should remain available when optional background processing is delayed, provided the primary database and outbox transaction are healthy.

### Load Balancer and Infrastructure Failure

- Use highly available load-balancing infrastructure.
- Distribute critical services across availability zones.
- Use resilient DNS and CDN providers.
- Maintain automated backups and regularly test restoration procedures.
- Monitor health and configure alerts for critical failures.

These measures reduce single points of failure but do not guarantee uninterrupted availability under every disaster scenario.

## 11. Monitoring and Scaling

### Important Monitoring Metrics

- API response times and error rates.
- Requests per second.
- Application server CPU and memory usage.
- Database CPU usage and slow queries.
- Redis cache hit and miss rates.
- Message queue depth and failed jobs.
- Database replication lag.
- Available storage capacity.
- Failover events and recovery times.

### Scaling Strategy

1. Add application servers when API traffic increases.
2. Use Redis to reduce repeated database reads.
3. Add read replicas when database read demand grows.
4. Optimize database queries and indexes.
5. Increase background workers when queue depth grows.
6. Use load testing to identify bottlenecks.
7. Consider partitioning or sharding only when simpler scaling methods are insufficient.

### Recovery Testing

The engineering team should regularly test:

- Failure of one application server.
- Failure of a read replica.
- Primary database failover.
- Redis unavailability.
- Message queue or worker failure.
- Backup restoration.

Testing should measure recovery time, data consistency, and user-visible errors.

## 12. Conclusion

The proposed QuickNotes architecture combines stateless application servers, highly available load balancing, Redis caching, PostgreSQL replication, and asynchronous background processing.

The system is designed around an estimated workload of 1 million registered users, approximately 230 peak reads per second, and 23 peak writes per second.

Reliable writes are committed to the primary database, while a transactional outbox and durable message queue support asynchronous background processing.

Application redundancy, replica fallback, primary database failover, cache bypass, and redundant queue processing reduce critical single points of failure.

The architecture provides a foundation for future growth. Its performance, reliability, and availability targets must be validated through load testing and failure testing before production deployment.
