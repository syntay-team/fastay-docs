---
title: "Deployment"
---

# Deploying Fastay Applications

Deploying a Fastay application means running your built application in a production environment where it can serve real traffic. Since Fastay builds on Express.js, deployment follows standard Node.js patterns, with specific attention to Fastay's configuration and file-based routing system.

## Understanding Fastay in Production

Fastay applications are Node.js servers that listen for HTTP requests. In production, your Fastay app needs to be reliable, secure, and properly configured for its environment. The core deployment task is ensuring your application runs consistently with the right configuration.

## Production Configuration

Fastay applications should behave differently in production versus development. The `NODE_ENV` environment variable controls this behavior.

### Essential Environment Variables

Set these in your production environment:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=your_production_database_url
JWT_SECRET=your_secure_secret_key
```

Never commit sensitive values like `JWT_SECRET` or database passwords to version control. Use your hosting platform's secret management or environment variable system.

### Production-Specific Fastay Configuration

When `NODE_ENV=production`, Fastay and its underlying Express.js components optimize for performance and security. Your application code should also check this variable:

```typescript
// In your route handlers or middleware
if (process.env.NODE_ENV === "production") {
  // Enable production-only features or restrictions
}
```

## Build and Run Workflow

Fastay application need compilation before running in production.

### Building for Production

Run the TypeScript compiler to generate JavaScript:

```bash
npm run build
```

This creates a `dist/` directory with your compiled application. The structure mirrors your `src/` directory, with `.ts` files converted to `.js`.

### Running the Built Application

After building, start the application from the compiled output:

```bash
npm run start
```

In production, you should run the compiled JavaScript, not use `ts-node` or development tools. This provides better performance and stability.

## Deployment Environments

Fastay can run in various hosting environments. Choose based on your needs and team's expertise.

### Virtual Private Server (VPS)

A VPS gives you full control over the environment. You manage the operating system, Node.js installation, and process management. This approach works well when you need custom configurations or have existing infrastructure experience.

### Platform-as-a-Service (PaaS)

Cloud platforms like Railway, Render, or Heroku abstract infrastructure management. They handle scaling, restarts, and sometimes even database provisioning. These platforms typically integrate with Git for automated deployments.

### Container Deployment

Containerizing your Fastay application with Docker provides environment consistency across development and production. While not required, containers make deployments predictable and can simplify multi-service architectures.

## Process Management

Production applications need supervision to ensure they stay running. A process manager handles restarts if your application crashes and can manage multiple instances.

### PM2 (Recommended for Node.js)

PM2 is a popular process manager for Node.js applications:

```bash
# Install PM2 globally
npm install -g pm2

# Start your Fastay application
pm2 start npm --name "fastay-app" -- run start

# Save the process list for automatic restarts
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

PM2 provides monitoring, logging, and clustering features without requiring system-level configuration.

### Systemd Service (Linux Systems)

For Linux servers, you can create a systemd service:

```ini
# /etc/systemd/system/fastay.service
[Unit]
Description=Fastay Application
After=network.target

[Service]
Type=simple
User=nodeuser
WorkingDirectory=/var/www/fastay-app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

This approach integrates with the operating system's service management but requires more initial setup.

## Health and Reliability

Production applications need to handle failures gracefully and provide observability.

### Automatic Restarts

Configure your process manager to restart the application if it crashes. Both PM2 and systemd support this with `Restart=on-failure` or similar configurations.

### Logging Strategy

Fastay applications should log to standard output (stdout) and standard error (stderr). In production:

- Avoid `console.log` for request logging in production (it's synchronous)
- Use a structured logging library for production logs
- Let your hosting platform or process manager handle log aggregation and rotation

Fastay doesn't include built-in logging middleware for production, so you need to add this based on your requirements.

### Graceful Shutdown

When your application receives a shutdown signal (like from a process manager or during deployment), it should:

1. Stop accepting new requests
2. Finish processing current requests
3. Clean up resources (database connections, etc.)
4. Exit cleanly

Fastay inherits Express.js's graceful shutdown behavior. For custom cleanup, listen for the shutdown signal:

```typescript
process.on("SIGTERM", () => {
  // Clean up resources before shutting down
  server.close(() => {
    process.exit(0);
  });
});
```

## What Fastay Does Not Handle

Fastay focuses on API structure and routing, not infrastructure concerns. You need to handle these separately:

### HTTPS Termination

Fastay serves HTTP traffic. In production, you should terminate HTTPS (SSL/TLS) at a reverse proxy or load balancer, not in your Node.js application. This is more secure and performant.

### Reverse Proxy

A reverse proxy like Nginx or Caddy should sit in front of Fastay to handle SSL termination, static file serving, compression, and sometimes rate limiting. The proxy forwards API requests to your Fastay application.

### Load Balancing

For scaling horizontally, use a load balancer to distribute traffic across multiple Fastay instances. Fastay itself doesn't include load balancing features.

These infrastructure concerns belong to your deployment environment, not your Fastay application code. This separation keeps your application portable across different hosting setups.

## Deployment Checklist

Before deploying your Fastay application:

- [ ] Set `NODE_ENV=production`
- [ ] Configure all required environment variables
- [ ] Run `npm run build` to compile TypeScript
- [ ] Test the built application locally with `npm run start`
- [ ] Set up a process manager (PM2 or systemd)
- [ ] Configure a reverse proxy for HTTPS and static files
- [ ] Set up logging and monitoring
- [ ] Implement a deployment rollback strategy

Fastay's straightforward architecture makes deployment similar to any Express.js application, with the added benefit of predictable file-based routing and clear separation between development and production configuration.
