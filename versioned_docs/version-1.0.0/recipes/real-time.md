---
title: "Real time"
---

# Real-Time Features with Fastay

Fastay applications can integrate real-time features such as chat, notifications, and live updates using WebSocket-based solutions. Since Fastay provides access to the underlying Node.js HTTP server, you can integrate Socket.IO or any WebSocket library to add real-time capabilities to your API.

## Understanding Fastay and WebSocket Integration

Fastay builds on Express.js, which means you have access to the Node.js HTTP server after creating your application, without changing the standard Express execution model. This server can be used to attach WebSocket handlers alongside your regular HTTP routes. The integration happens in your main application file where you configure Fastay.

## Step-by-Step Socket.IO Integration

Follow these steps to add real-time capabilities to your Fastay application using Socket.IO.

### Step 1: Install Socket.IO

First, install the Socket.IO library:

```bash
npm install socket.io
```

### Step 2: Configure Fastay to Serve Static Files

Create a `public` directory in your project root if it doesn't exist. This directory will hold your HTML file and any other static assets.

```typescript
// src/index.ts
import { createApp } from "@syntay/fastay";
import "dotenv/config";

const port = 5000;

void (async () => {
  const { server } = await createApp({
    apiDir: "./src/api",
    baseRoute: "/api", // Using /api for API routes
    port: port,
    expressOptions: {
      static: {
        path: "public", // Serve files from public directory
        options: {
          maxAge: "1d", // Cache for 1 day
          etag: true, // Enable ETag for caching
        },
      },
    },
  });
})();
```

Note that we're using `/api` as the base route for API endpoints. This avoids conflicts when serving the HTML file from the root URL.

### Step 3: Create the HTML Interface

Create an `index.html` file in the `public` directory:

```html
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Socket.IO Chat with Fastay</title>
    <style>
      /* CSS styles from the example */
      body {
        margin: 0;
        padding-bottom: 3rem;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
          Arial, sans-serif;
      }

      h1 {
        text-align: center;
        background: #333;
        color: #fff;
        margin: 0;
        padding: 1rem 0;
      }

      #form {
        background: rgba(0, 0, 0, 0.15);
        padding: 0.25rem;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        height: 3rem;
        box-sizing: border-box;
        backdrop-filter: blur(10px);
        max-width: 600px;
        margin: auto;
      }
      #input {
        border: none;
        padding: 0 1rem;
        flex-grow: 1;
        border-radius: 2rem;
        margin: 0.25rem;
      }
      #input:focus {
        outline: none;
      }
      #form > button {
        background: #333;
        border: none;
        padding: 0 1rem;
        margin: 0.25rem;
        border-radius: 3px;
        outline: none;
        color: #fff;
      }

      #messages {
        list-style-type: none;
        margin: 0;
        padding: 0;
      }
      #messages > li {
        padding: 0.5rem 1rem;
      }
      #messages > li:nth-child(odd) {
        background: #efefef;
      }
    </style>
  </head>
  <body>
    <h1>Socket.IO Chat with Fastay</h1>
    <ul id="messages"></ul>
    <form id="form" action="">
      <input id="input" placeholder="Type your message" autocomplete="off" />
      <button>Send</button>
    </form>
  </body>
</html>
```

With this setup, you can access `http://localhost:5000` to see the HTML page. The `baseRoute: '/api'` configuration ensures API routes don't conflict with the static file serving.

### Step 4: Configure Socket.IO Server

Update your `src/index.ts` to set up Socket.IO on the Fastay server:

```typescript
import { createApp } from "@syntay/fastay";
import { Server } from "socket.io";
import "dotenv/config";

const port = 5000;

void (async () => {
  const { app, server } = await createApp({
    apiDir: "./src/api",
    baseRoute: "/api",
    port: port,
    expressOptions: {
      static: {
        path: "public",
        options: {
          maxAge: "1d",
          etag: true,
        },
      },
    },
  });

  // Create Socket.IO server
  const io = new Server(server);

  // Handle Socket.IO connections
  io.on("connection", (socket) => {
    console.log("A user connected");

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected");
    });

    // Handle chat messages
    socket.on("chat message", (msg) => {
      console.log("Message received:", msg);

      // Broadcast message to all connected clients
      io.emit("chat message", msg);
    });

    // You can add more event handlers here
    socket.on("user typing", (username) => {
      socket.broadcast.emit("user typing", username);
    });

    socket.on("stop typing", (username) => {
      socket.broadcast.emit("stop typing", username);
    });
  });
})();
```

The `createApp` function returns both the Express application (`app`) and the underlying HTTP server (`server`). You use this server to attach Socket.IO.

### Step 5: Add Socket.IO Client to HTML

Update your `public/index.html` to include Socket.IO client logic:

```html
<!doctype html>
<html>
  <!-- Head section remains the same -->
  <body>
    <h1>Socket.IO Chat with Fastay</h1>
    <ul id="messages"></ul>
    <form id="form" action="">
      <input id="input" placeholder="Type your message" autocomplete="off" />
      <button>Send</button>
    </form>

    <!-- Socket.IO client library -->
    <script src="/socket.io/socket.io.js"></script>

    <!-- Client-side Socket.IO logic -->
    <script>
      // Connect to the Socket.IO server
      const socket = io();

      // Get DOM elements
      const form = document.getElementById("form");
      const input = document.getElementById("input");
      const messages = document.getElementById("messages");

      // Handle form submission
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (input.value.trim()) {
          // Emit the message to the server
          socket.emit("chat message", input.value);
          input.value = "";
        }
      });

      // Handle incoming messages
      socket.on("chat message", (msg) => {
        const item = document.createElement("li");
        item.textContent = msg;
        messages.appendChild(item);

        // Scroll to the bottom
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Optional: Handle typing indicators
      input.addEventListener("input", () => {
        if (input.value.trim()) {
          socket.emit("user typing", "Someone");
        } else {
          socket.emit("stop typing", "Someone");
        }
      });
    </script>
  </body>
</html>
```

The Socket.IO client library is automatically served at `/socket.io/socket.io.js` by the Socket.IO server.

### Step 6: Test Your Application

1. Start your Fastay application:

   ```bash
   npm run dev:watch
   ```

2. Open `http://localhost:5000` in your browser
3. Open the same URL in another browser tab or window
4. Type messages in one tab and see them appear in the other tab in real-time

## Advanced Real-Time Patterns

### Integrating with Fastay Authentication

You can combine Socket.IO with your existing Fastay authentication:

```typescript
// In your Socket.IO configuration
io.use(async (socket, next) => {
  try {
    // Extract token from handshake
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    // Verify token (using your existing JWT verification)
    const user = verifyToken(token);

    // Attach user to socket for use in handlers
    socket.user = user;

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.id}`);

  // User joins their personal room
  socket.join(`user:${socket.user.id}`);

  // Send notifications to specific users
  socket.on("private message", (data) => {
    io.to(`user:${data.userId}`).emit("new message", data.message);
  });
});
```

### Room-Based Communication

Organize connections into rooms for group communication:

```typescript
io.on("connection", (socket) => {
  // Join a chat room
  socket.on("join room", (roomId) => {
    socket.join(`room:${roomId}`);
    console.log(`User joined room: ${roomId}`);
  });

  // Leave a chat room
  socket.on("leave room", (roomId) => {
    socket.leave(`room:${roomId}`);
    console.log(`User left room: ${roomId}`);
  });

  // Send message to specific room
  socket.on("room message", ({ roomId, message }) => {
    io.to(`room:${roomId}`).emit("room message", {
      user: socket.user?.username || "Anonymous",
      message,
      timestamp: new Date().toISOString(),
    });
  });
});
```

### Real-Time Notifications

Implement a notification system:

```typescript
// Notification service that can be used from Fastay routes
export class NotificationService {
  constructor(private io: Server) {}

  async sendNotification(userId: string, notification: any) {
    // Emit to user's personal room
    this.io.to(`user:${userId}`).emit("notification", notification);

    // Optionally store in database for later retrieval
    await db.notification.create({
      data: {
        userId,
        type: notification.type,
        message: notification.message,
        read: false,
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    await db.notification.update({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    // Notify client that notification was read
    this.io.to(`user:${userId}`).emit("notification:read", notificationId);
  }
}

// Use from a Fastay route
export async function POST(request: Request) {
  const notificationData = await request.body;

  // Send real-time notification
  await notificationService.sendNotification(request.user.id, notificationData);

  return { success: true };
}
```

## Alternative WebSocket Libraries

While Socket.IO is a popular choice, Fastay works with any WebSocket library. Here are alternatives:

### Using `ws` (WebSocket Native Implementation)

```typescript
import { createApp } from "@syntay/fastay";
import { WebSocketServer } from "ws";

void (async () => {
  const { server } = await createApp({
    /* config */
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      console.log("Received:", message);

      // Broadcast to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });
})();
```

### Using `uWebSockets.js` (High Performance)

```typescript
import { createApp } from "@syntay/fastay";
import uWS from "uWebSockets.js";

void (async () => {
  const { server } = await createApp({
    /* config */
  });

  // uWebSockets.js has its own server implementation
  // You would typically run it alongside Fastay on a different port, since uWebSockets.js uses its own server model.
});
```

## Best Practices for Real-Time Fastay Applications

1. **Separate concerns**: Keep WebSocket logic separate from your HTTP route handlers. Consider creating a `src/websocket/` directory.

2. **Reuse authentication**: Use the same authentication middleware for both HTTP and WebSocket connections when possible.

3. **Handle disconnections gracefully**: Clean up resources when users disconnect and implement reconnection logic.

4. **Rate limiting**: Apply rate limiting to WebSocket events to prevent abuse.

5. **Error handling**: Implement comprehensive error handling for WebSocket connections.

6. **Scalability considerations**: For multiple server instances, use Redis adapter for Socket.IO or similar solutions for other libraries.

7. **Testing**: Test both the WebSocket server and client components of your application.

8. **Resource management**: Be mindful of memory usage with many concurrent connections.

## Troubleshooting Common Issues

**Issue**: Socket.IO client cannot connect
**Solution**: Ensure CORS is configured if your client is on a different domain:

```typescript
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your frontend URL
    credentials: true,
  },
});
```

**Issue**: Static files not serving
**Solution**: Check that the `public` directory exists and verify the static middleware configuration.

**Issue**: Port conflicts
**Solution**: Ensure no other application is using port 5000, or configure Fastay to use a different port.

**Issue**: Authentication not working with WebSockets
**Solution**: Verify token extraction and validation in your Socket.IO middleware matches your HTTP authentication.

Fastay's architecture makes it straightforward to add real-time features alongside your existing REST API. By accessing the underlying HTTP server, you can integrate any WebSocket library that works with Node.js, giving you flexibility to choose the best solution for your specific use case.
