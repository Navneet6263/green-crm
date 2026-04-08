## GreenCRM Scaling Notes

This codebase is tenant-first and stateless at the API layer so it can sit behind a load balancer without sticky sessions.

### What is already in the app

- Every tenant-owned table includes `company_id`.
- Lead and user list APIs are paginated.
- Lead, note, activity, and reminder APIs also support cursor pagination for large result sets.
- Core tenant access paths are indexed by `company_id`, `assigned_to`, and `created_at`.
- Dashboard summaries are short-TTL cached in-process to flatten burst traffic.
- Request limiting is enabled in-process to protect local or single-node deployments.
- Auth uses signed bearer tokens rather than in-memory sessions.
- `/health` is available for container probes and load balancer health checks.

### What to change for real scale

- Replace the in-memory rate limiter with Redis so limits are shared across app instances.
- Run the API behind Nginx, HAProxy, AWS ALB, or another L7 load balancer.
- Move reminder processing and CSV imports to background workers when volumes grow.
- Add read replicas for reporting-heavy workloads.
- Add SQL Server query monitoring and slow query logging before traffic reaches production.
- Store uploaded CSV files in object storage rather than sending large payloads directly.

### Redis fit

Redis is the right next step for:

- distributed rate limiting
- shared dashboard caching across app instances
- queue-backed reminder dispatch
- short-lived login throttling and OTP flows

The current implementation keeps the app dependency-free, but the service boundaries are ready for a Redis-backed adapter.
