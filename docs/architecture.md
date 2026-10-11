
# QuickNotes System Architecture

## 1. Overview

QuickNotes is a cloud-based note-taking application designed to serve 1 million registered users.

The system allows users to create, read, update, delete, and organize notes. It must remain secure, reliable, responsive, and scalable as usage grows.

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

- Availability: Target 99.9% uptime.
- Performance: Target API response time below 300 ms at the 95th percentile for normal requests.
- Scalability: Support growth beyond 1 million registered users.
- Security: Use HTTPS, authentication, authorization, and input validation.
- Reliability: Use replication, backups, and recovery procedures.
- Maintainability: Separate frontend, API, database, and background processing.
- Observability: Collect logs, metrics, and alerts.

These are proposed engineering targets, not measured performance guarantees.

## 4. Load and Storage Estimates

### Assumptions

- Registered users: 1,000,000
- Daily active users: 20% = 200,000
- Each active user reads 20 notes per day.
- Each active user creates or updates 2 notes per day.
- Average note size: 2 KB
- Average day: 86,400 seconds
- Peak traffic: 5 times average
- One year: 365 days

### Reads per Day

200,000 × 20 = 4,000,000 reads/day

Average reads per second:

4,000,000 / 86,400 = approximately 46 reads/second

Peak reads per second:

46 × 5 = approximately 230 reads/second

### Writes per Day

200,000 × 2 = 400,000 writes/day

Average writes per second:

400,000 / 86,400 = approximately 4.6 writes/second

Peak writes per second:

4.6 × 5 = approximately 23 writes/second

### Storage per Year

400,000 × 2 KB = 800,000 KB/day

800,000 KB × 365 = 292,000,000 KB/year

Approximately 292 GB/year of new note data, using decimal units.

This is a simplified upper-bound estimate that treats all writes as new notes. Updates to existing notes may not add a full new note.

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

The workload is read-heavy, with approximately 10 reads for every write.

## 5. Architecture Diagram

```text
                    +----------------------+
                    |    Web / Mobile      |
                    |       Client         |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |         DNS          |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |         CDN          |
                    |   Static Assets      |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |    Load Balancer     |
                    +----------+-----------+
                               |
                   +-----------+-----------+
                   |                       |
                   v                       v
          +----------------+      +----------------+
          |  App Server 1  |      |  App Server 2  |
          +--------+-------+      +--------+-------+
                   |                       |
                   +-----------+-----------+
                               |
             +-----------------+------------------+
             |                 |                  |
             v                 v                  v
      +-------------+   +-------------+    +-------------+
      | Redis Cache |   | Primary DB  |    | Message     |
      |             |   | PostgreSQL  |    | Queue       |
      +-------------+   +------+------+    +------+------+
                              |                  |
                              v                  v
                       +-------------+    +-------------+
                       | Read Replica|    | Background  |
                       | PostgreSQL  |    | Worker      |
                       +-------------+    +-------------+
```

The read replica receives database changes from the primary. Application servers may send eligible read queries to the replica.

## 6. Component Explanations

1. **Client:** Provides the user interface for creating, viewing, and managing notes.
2. **DNS:** Resolves the QuickNotes domain name to the appropriate service endpoint.
3. **CDN:** Delivers static files such as HTML, CSS, and JavaScript from nearby locations to reduce latency.
4. **Load Balancer:** Distributes API requests across healthy application servers.
5. **App Server 1:** Processes authenticated API requests and business logic.
6. **App Server 2:** Provides additional processing capacity and redundancy.
7. **Redis Cache:** Stores frequently requested data to reduce database reads.
8. **Primary Database:** Stores authoritative user accounts, notes, tags, and relationships.
9. **Read Replica:** Handles suitable read-only queries and reduces load on the primary database.
10. **Message Queue:** Holds background jobs until workers can process them reliably.
11. **Background Worker:** Processes tasks such as notifications, search indexing, and cleanup outside the main request.

## 7. GET /notes Request Flow

1. The user opens QuickNotes in the browser.
2. DNS resolves the application's domain.
3. The CDN serves the frontend's static assets.
4. The browser sends an authenticated GET /notes request.
5. The load balancer forwards the request to a healthy application server.
6. The server validates the access token and identifies the user.
7. The server checks Redis for cached notes belonging to that user.
8. If a valid cache entry exists, the server returns the cached data.
9. If the cache misses, the server queries PostgreSQL, potentially using the read replica.
10. The query filters by user ID and applies pagination.
11. The server may store the result in Redis with a short expiration time.
12. The API returns HTTP 200 with the user's notes in JSON.
13. The browser displays the notes or an empty-state message.

Sensitive note data must be cached using user-specific keys and protected access controls.

## 8. POST /notes Request Flow

1. The user enters a title and optional body.
2. The browser validates that the title contains 1 to 100 characters.
3. The browser sends POST /notes with JSON and an authentication token.
4. The load balancer forwards the request to an available application server.
5. The server authenticates the user.
6. The server validates and sanitizes input according to the API rules.
7. The server inserts the note into the primary PostgreSQL database.
8. The database commits the transaction and generates the new note ID.
9. The server invalidates or updates affected Redis cache entries.
10. The server publishes optional background work, such as search indexing, to the message queue.
11. A worker processes the queued job, with retries for temporary failures.
12. The API returns HTTP 201 Created with the saved note and its ID.
13. The browser displays the new note and a success message.

For production reliability, a transactional outbox can ensure background events are not lost between the database commit and queue publication.

## 9. Architecture Trade-offs

### Trade-off 1: Caching vs Freshness

Redis reduces database load and improves read speed.

However, cached notes can become stale after a user edits or deletes them.

Mitigation: Invalidate affected cache entries after writes and use short cache expiration times.

### Trade-off 2: Read Replicas vs Consistency

Read replicas increase read capacity and reduce primary database workload.

However, replication may lag behind recent writes.

Mitigation: Route read-after-write requests to the primary when users need immediately consistent results.

### Trade-off 3: Background Jobs vs Complexity

Message queues keep slow work outside user-facing API requests.

However, they introduce additional infrastructure and delayed processing.

Mitigation: Use durable queues, retries, idempotent workers, and dead-letter queues.

### Trade-off 4: Multiple App Servers vs Cost

Multiple application servers improve availability and allow horizontal scaling.

However, additional servers increase hosting and operational costs.

Mitigation: Use autoscaling and monitor utilization to balance capacity and expense.

## 10. Avoiding Single Points of Failure

The system should avoid depending on one machine or service.

- Run at least two application servers across separate availability zones.
- Use a highly available load balancer.
- Configure Redis with replication and automatic failover, or allow requests to bypass the cache when Redis is unavailable.
- Use a standby primary database with automatic failover.
- Maintain database backups and regularly test recovery.
- Deploy redundant queue brokers and multiple workers.
- Use a reliable DNS provider and CDN with resilient infrastructure.
- Monitor system health and alert engineers when components fail.

A read replica alone does not guarantee automatic database failover; a dedicated failover mechanism is needed.

## 11. Monitoring and Scaling

Monitor:

- API response times and error rates.
- Requests per second.
- Database CPU usage and slow queries.
- Cache hit and miss rates.
- Queue depth and failed jobs.
- Replication lag.
- Available storage capacity.

Scale application servers horizontally as traffic increases.

Optimize SQL queries and indexes before introducing more complex database partitioning or sharding.

## 12. Conclusion

The proposed QuickNotes architecture combines stateless application servers, a load balancer, Redis caching, PostgreSQL replication, and background job processing.

The design supports the estimated workload for 1 million registered users while providing a foundation for future growth.

Its performance and availability targets must be validated through load testing and failure testing before production deployment.
```
