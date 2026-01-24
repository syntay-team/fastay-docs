---
title: "Monitoring"
---

# Monitoring Fastay Applications

Monitoring is essential for understanding how your Fastay application behaves in production, identifying performance issues, debugging errors, and maintaining system reliability. Unlike development environments where you can use console.log and manual inspection, production requires structured, scalable monitoring solutions.

## Understanding Fastay Monitoring Requirements

Monitoring Fastay applications involves tracking multiple aspects:

- **Application metrics**: Request rates, response times, error rates
- **Resource utilization**: CPU, memory, disk I/O, network usage
- **Business metrics**: User actions, transaction volumes, conversion rates
- **External dependencies**: Database performance, third-party API health
- **Infrastructure**: Server health, container orchestration, load balancing

Fastay's middleware-based architecture makes it particularly suitable for implementing comprehensive monitoring through middleware that captures request-level data.

## Structured Logging Implementation

Console.log statements are insufficient for production. Implement structured logging that captures context and enables filtering:

```typescript
// src/utils/logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: "fastay-api",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    // Log errors to separate file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Log all to combined file
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 10,
    }),
    // Console output in development
    ...(process.env.NODE_ENV !== "production"
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
        ]
      : []),
  ],
});

// Log streaming for external log aggregation
if (process.env.LOGSTASH_HOST) {
  const transports = require("winston-logstash-transport").LogstashTransport;
  logger.add(
    new transports({
      host: process.env.LOGSTASH_HOST,
      port: parseInt(process.env.LOGSTASH_PORT || "5000"),
      mode: "tcp",
    }),
  );
}
```

## Request-Level Metrics Collection

Middleware is the ideal place to capture request metrics:

```typescript
// src/middlewares/metrics.ts
import { Request, Response, Next } from "@syntay/fastay";

// Simple in-memory metrics store (use Redis for distributed apps)
const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  responseTimes: [] as number[],
  requestsByEndpoint: new Map<string, number>(),
  errorsByEndpoint: new Map<string, number>(),
  statusCodes: new Map<number, number>(),
};

export async function metricsMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  const startTime = Date.now();
  const endpoint = `${request.method} ${request.path}`;

  // Increment counters
  metrics.totalRequests++;
  metrics.requestsByEndpoint.set(
    endpoint,
    (metrics.requestsByEndpoint.get(endpoint) || 0) + 1,
  );

  response.on("finish", () => {
    const duration = Date.now() - startTime;

    // Store response time
    metrics.responseTimes.push(duration);
    if (metrics.responseTimes.length > 1000) {
      metrics.responseTimes.shift(); // Keep only recent 1000
    }

    // Track status codes
    metrics.statusCodes.set(
      response.statusCode,
      (metrics.statusCodes.get(response.statusCode) || 0) + 1,
    );

    // Track errors
    if (response.statusCode >= 400) {
      metrics.totalErrors++;
      metrics.errorsByEndpoint.set(
        endpoint,
        (metrics.errorsByEndpoint.get(endpoint) || 0) + 1,
      );
    }

    // Log slow requests
    if (duration > 1000) {
      // > 1 second
      logger.warn("Slow request detected", {
        endpoint,
        duration,
        method: request.method,
        statusCode: response.statusCode,
        userAgent: request.get("user-agent"),
        ip: request.ip,
      });
    }
  });

  next();
}

// Export metrics for monitoring endpoints
export function getMetrics() {
  const responseTimes = metrics.responseTimes;
  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  return {
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    errorRate:
      metrics.totalRequests > 0
        ? metrics.totalErrors / metrics.totalRequests
        : 0,
    avgResponseTime,
    p95ResponseTime: calculatePercentile(responseTimes, 95),
    p99ResponseTime: calculatePercentile(responseTimes, 99),
    requestsByEndpoint: Object.fromEntries(
      metrics.requestsByEndpoint.entries(),
    ),
    errorsByEndpoint: Object.fromEntries(metrics.errorsByEndpoint.entries()),
    statusCodes: Object.fromEntries(metrics.statusCodes.entries()),
  };
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}
```

## Health Check Endpoints

Fastay applications should expose health endpoints for infrastructure monitoring:

```typescript
// src/api/health/route.ts
import { Request } from "@syntay/fastay";

export async function GET(request: Request) {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkExternalApi(),
    checkDiskSpace(),
    checkMemoryUsage(),
  ]);

  const results = checks.map((result, index) => ({
    service: ["database", "redis", "external-api", "disk", "memory"][index],
    status: result.status === "fulfilled" && result.value,
    error: result.status === "rejected" ? result.reason.message : null,
  }));

  const allHealthy = results.every((r) => r.status);
  const statusCode = allHealthy ? 200 : 503;

  return {
    status: statusCode,
    body: {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: results,
      version: process.env.npm_package_version,
    },
  };
}

// Individual check implementations
async function checkDatabase() {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkRedis() {
  if (!process.env.REDIS_URL) return { healthy: true, skipped: true };

  const start = Date.now();
  try {
    await redis.ping();
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkExternalApi() {
  const start = Date.now();
  try {
    const response = await fetch("https://api.example.com/health", {
      timeout: 5000,
    });
    const latency = Date.now() - start;
    return {
      healthy: response.ok,
      latency,
      status: response.status,
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

## Distributed Tracing

For microservices architectures, implement distributed tracing:

```typescript
// src/middlewares/tracing.ts
import { Request, Response, Next } from "@syntay/fastay";

export function tracingMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  // Extract or generate trace ID
  const traceId = request.headers["x-trace-id"] || crypto.randomUUID();
  const spanId = crypto.randomUUID();

  // Create trace context
  request.traceContext = {
    traceId,
    spanId,
    parentSpanId: request.headers["x-parent-span-id"],
    sampled: request.headers["x-trace-sampled"] === "true",
  };

  // Add trace headers to response
  response.setHeader("X-Trace-ID", traceId);
  response.setHeader("X-Span-ID", spanId);

  // Log with trace context
  const originalLog = console.log;
  const originalError = console.error;

  // Patch console methods to include trace context
  if (request.traceContext.sampled) {
    console.log = (...args) => {
      originalLog(`[${traceId}:${spanId}]`, ...args);
    };

    console.error = (...args) => {
      originalError(`[${traceId}:${spanId}]`, ...args);
    };
  }

  // Restore console methods after request
  response.on("finish", () => {
    console.log = originalLog;
    console.error = originalError;
  });

  // Propagate trace headers to downstream services
  request.traceHeaders = {
    "X-Trace-ID": traceId,
    "X-Span-ID": spanId,
    "X-Parent-Span-ID": spanId,
    "X-Trace-Sampled": request.traceContext.sampled.toString(),
  };

  next();
}

// Helper for making requests with trace context
export function tracedFetch(url: string, options: RequestInit = {}) {
  return async (request: Request) => {
    const headers = {
      ...options.headers,
      ...request.traceHeaders,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };
}
```

## Alerting Configuration

Configure alerts for critical conditions:

```typescript
// src/utils/alerts.ts
export class AlertManager {
  private cooldownPeriods = new Map<string, number>();

  constructor(
    private alertChannels: AlertChannel[],
    private cooldownMs = 5 * 60 * 1000, // 5 minutes
  ) {}

  async alert(alert: Alert) {
    const cooldownKey = `${alert.type}:${alert.severity}`;
    const lastAlerted = this.cooldownPeriods.get(cooldownKey);

    // Check cooldown period
    if (lastAlerted && Date.now() - lastAlerted < this.cooldownMs) {
      return;
    }

    // Send to all configured channels
    await Promise.allSettled(
      this.alertChannels.map((channel) => channel.send(alert)),
    );

    // Update cooldown
    this.cooldownPeriods.set(cooldownKey, Date.now());
  }
}

export interface Alert {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  data?: any;
  timestamp: Date;
}

// Example alert conditions in middleware
export async function alertingMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  const startTime = Date.now();

  response.on("finish", () => {
    const duration = Date.now() - startTime;

    // Alert on high error rate
    if (response.statusCode >= 500) {
      alertManager.alert({
        type: "SERVER_ERROR",
        severity: "critical",
        message: `Server error on ${request.method} ${request.path}`,
        data: {
          statusCode: response.statusCode,
          duration,
          ip: request.ip,
        },
        timestamp: new Date(),
      });
    }

    // Alert on very slow responses
    if (duration > 5000) {
      // 5 seconds
      alertManager.alert({
        type: "SLOW_RESPONSE",
        severity: "warning",
        message: `Slow response detected: ${duration}ms`,
        data: {
          endpoint: `${request.method} ${request.path}`,
          duration,
          statusCode: response.statusCode,
        },
        timestamp: new Date(),
      });
    }
  });

  next();
}
```

## Metrics Export for Prometheus

Export metrics in Prometheus format for monitoring systems:

```typescript
// src/api/metrics/route.ts
import { Request } from "@syntay/fastay";
import { getMetrics } from "../../middlewares/metrics";

export async function GET(request: Request) {
  const metrics = getMetrics();

  // Format as Prometheus metrics
  const prometheusMetrics = `
# HELP fastay_requests_total Total number of requests
# TYPE fastay_requests_total counter
fastay_requests_total ${metrics.totalRequests}

# HELP fastay_errors_total Total number of errors
# TYPE fastay_errors_total counter
fastay_errors_total ${metrics.totalErrors}

# HELP fastay_response_time_seconds Average response time
# TYPE fastay_response_time_seconds gauge
fastay_response_time_seconds ${metrics.avgResponseTime / 1000}

# HELP fastay_response_time_seconds_p95 95th percentile response time
# TYPE fastay_response_time_seconds_p95 gauge
fastay_response_time_seconds_p95 ${metrics.p95ResponseTime / 1000}

# HELP fastay_response_time_seconds_p99 99th percentile response time
# TYPE fastay_response_time_seconds_p99 gauge
fastay_response_time_seconds_p99 ${metrics.p99ResponseTime / 1000}
`.trim();

  return {
    headers: {
      "Content-Type": "text/plain; version=0.0.4",
    },
    body: prometheusMetrics,
  };
}
```

## Real-Time Monitoring Dashboard

Create a simple real-time monitoring endpoint:

```typescript
// src/api/admin/monitoring/route.ts
import { Request } from "@syntay/fastay";
import { getMetrics } from "../../../middlewares/metrics";
import os from "os";

export async function GET(request: Request) {
  // Only allow admins
  if (request.user?.role !== "admin") {
    return {
      status: 403,
      body: { error: "Admin access required" },
    };
  }

  const appMetrics = getMetrics();
  const systemMetrics = {
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
    },
    cpu: {
      loadavg: os.loadavg(),
      cores: os.cpus().length,
    },
    uptime: {
      system: os.uptime(),
      process: process.uptime(),
    },
    network: Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && !i.internal)
      .map((i) => ({
        address: i.address,
        netmask: i.netmask,
        family: i.family,
      })),
  };

  return {
    application: appMetrics,
    system: systemMetrics,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    nodeVersion: process.version,
  };
}
```

## Log Correlation and Analysis

Implement log correlation for easier debugging:

```typescript
// src/middlewares/logCorrelation.ts
import { Request, Response, Next } from "@syntay/fastay";

export function logCorrelationMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  // Generate or extract correlation IDs
  const correlationId =
    request.headers["x-correlation-id"] || crypto.randomUUID();
  const requestId = crypto.randomUUID();

  // Store on request for use throughout the request lifecycle
  request.correlationId = correlationId;
  request.requestId = requestId;

  // Add to response headers
  response.setHeader("X-Correlation-ID", correlationId);
  response.setHeader("X-Request-ID", requestId);

  // Create a child logger with correlation context
  request.logger = logger.child({
    correlationId,
    requestId,
    ip: request.ip,
    userAgent: request.get("user-agent"),
    path: request.path,
    method: request.method,
  });

  // Log request start
  request.logger.info("Request started", {
    query: request.query,
    user: request.user?.id,
  });

  // Log request completion
  const startTime = Date.now();
  response.on("finish", () => {
    const duration = Date.now() - startTime;

    request.logger.info("Request completed", {
      duration,
      statusCode: response.statusCode,
      contentLength: response.get("content-length"),
    });
  });

  next();
}

// Usage in route handlers
export async function GET(request: Request) {
  // Use the request-specific logger
  request.logger?.info("Fetching user data", {
    userId: request.params.id,
  });

  try {
    const user = await userService.findById(request.params.id);
    return { user };
  } catch (error) {
    request.logger?.error("Failed to fetch user", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
```

## Monitoring Configuration Best Practices

### Environment-Specific Configuration

```typescript
// src/config/monitoring.ts
export const monitoringConfig = {
  development: {
    level: "debug",
    console: true,
    file: true,
    metrics: false,
    alerts: false,
    sampleRate: 1.0, // Log everything
  },
  production: {
    level: "info",
    console: false,
    file: true,
    metrics: true,
    alerts: true,
    sampleRate: 0.1, // Sample 10% of requests for detailed logging
  },
  get current() {
    return this[process.env.NODE_ENV || "development"];
  },
};
```

### Retention and Rotation Policies

Configure log rotation to prevent disk space issues:

```typescript
// In your logger configuration
new winston.transports.File({
  filename: "logs/app.log",
  maxsize: 10485760, // 10MB
  maxFiles: 10,
  tailable: true,
  zippedArchive: true, // Compress old logs
});
```

## Integration with External Monitoring Services

Fastay can integrate with services like Datadog, New Relic, or Sentry:

```typescript
// src/middlewares/externalMonitoring.ts
import { Request, Response, Next } from "@syntay/fastay";

export function externalMonitoringMiddleware(
  request: Request,
  response: Response,
  next: Next,
) {
  const startTime = Date.now();

  response.on("finish", () => {
    const duration = Date.now() - startTime;

    // Send to Datadog
    if (process.env.DATADOG_API_KEY) {
      sendToDatadog({
        metric: "fastay.request.duration",
        points: [[Math.floor(Date.now() / 1000), duration]],
        tags: [
          `method:${request.method}`,
          `path:${request.path}`,
          `status:${response.statusCode}`,
          `env:${process.env.NODE_ENV}`,
        ],
      });
    }

    // Send to New Relic
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      sendToNewRelic({
        eventType: "FastayRequest",
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        duration,
        timestamp: Date.now(),
      });
    }
  });

  next();
}
```

## Monitoring Checklist for Fastay Applications

Before deploying to production, ensure:

- [ ] **Structured logging** implemented with Winston or similar
- [ ] **Request metrics** captured for performance analysis
- [ ] **Health endpoints** exposed for infrastructure monitoring
- [ ] **Error tracking** integrated (Sentry, Rollbar, etc.)
- [ ] **Alerting configured** for critical conditions
- [ ] **Log correlation** implemented for distributed tracing
- [ ] **Metrics export** available for Prometheus or similar
- [ ] **Retention policies** defined for logs and metrics
- [ ] **Access controls** in place for monitoring endpoints
- [ ] **Performance baselines** established for alert thresholds

Effective monitoring transforms Fastay applications from black boxes into observable, debuggable systems. By implementing comprehensive monitoring early, you can detect issues before they affect users, understand performance characteristics, and make data-driven decisions about scaling and optimization.
