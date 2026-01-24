---
title: "File Upload"
description: "Handle file uploads in Fastay with robust validation, secure storage, and efficient processing patterns."
---

# File Uploads in Fastay

Fastay provides straightforward handling for file uploads through its integration with Express.js and native browser APIs. This recipe covers secure file upload implementation with proper validation, storage, and processing.

## Understanding File Uploads in Fastay

File uploads in Fastay use the standard `multipart/form-data` format. Fastay automatically parses FormData requests, making uploaded files accessible through the request object. The key aspects to consider are:

- **File size limits**: Prevent denial of service through large uploads
- **File type validation**: Only accept allowed file types
- **Secure storage**: Store files safely with proper access controls
- **Processing**: Handle image resizing, virus scanning, or other transformations
- **Cleanup**: Remove temporary files and manage storage quotas

## Basic File Upload Implementation

Here's a basic endpoint for handling file uploads:

```typescript
// src/api/upload/route.ts
import { Request } from "@syntay/fastay";
import fs from "fs/promises";
import path from "path";

// POST /api/upload
export async function POST(request: Request) {
  // Get FormData from request
  const formData = await request.formData();

  // Extract the file
  const file = formData.get("file") as File;

  if (!file) {
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: "No file provided",
      },
    };
  }

  // Basic validation
  if (file.size > 10 * 1024 * 1024) {
    // 10MB limit
    return {
      status: 400,
      body: {
        error: "VALIDATION_ERROR",
        message: "File size exceeds 10MB limit",
      },
    };
  }

  // Generate safe filename
  const fileExtension = file.name.split(".").pop() || "";
  const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
  const uploadPath = path.join(process.cwd(), "uploads", safeFilename);

  // Ensure upload directory exists
  await fs.mkdir(path.dirname(uploadPath), { recursive: true });

  // Save the file
  await fs.writeFile(uploadPath, Buffer.from(await file.arrayBuffer()));

  return {
    status: 201,
    body: {
      message: "File uploaded successfully",
      file: {
        originalName: file.name,
        storedName: safeFilename,
        size: file.size,
        mimeType: file.type,
        url: `/uploads/${safeFilename}`,
      },
    },
  };
}
```

## Comprehensive File Upload with Validation

For production applications, implement more robust validation and processing:

```typescript
// src/middlewares/fileUpload.ts
import { Request, Response, Next } from "@syntay/fastay";

export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
  fieldName?: string;
}

export function fileUploadMiddleware(options: FileUploadOptions = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"],
    maxFiles = 5,
    fieldName = "files",
  } = options;

  return async function (request: Request, response: Response, next: Next) {
    try {
      const formData = await request.formData();
      const files = formData.getAll(fieldName) as File[];

      // Validate number of files
      if (files.length > maxFiles) {
        return response.status(400).json({
          error: "VALIDATION_ERROR",
          message: `Maximum ${maxFiles} files allowed`,
        });
      }

      // Validate each file
      const validatedFiles = [];

      for (const file of files) {
        // Check file size
        if (file.size > maxSize) {
          return response.status(400).json({
            error: "VALIDATION_ERROR",
            message: `File ${file.name} exceeds size limit of ${maxSize / 1024 / 1024}MB`,
          });
        }

        // Check file type
        if (!allowedTypes.includes(file.type)) {
          return response.status(400).json({
            error: "VALIDATION_ERROR",
            message: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(", ")}`,
          });
        }

        // Check filename security
        if (
          file.name.includes("..") ||
          file.name.includes("/") ||
          file.name.includes("\\")
        ) {
          return response.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Invalid filename",
          });
        }

        validatedFiles.push(file);
      }

      // Store validated files on request
      request.files = validatedFiles;
      request.formFields = {};

      // Store other form fields
      for (const [key, value] of formData.entries()) {
        if (key !== fieldName) {
          request.formFields[key] = value;
        }
      }

      next();
    } catch (error) {
      console.error("File upload error:", error);
      return response.status(500).json({
        error: "UPLOAD_ERROR",
        message: "Failed to process file upload",
      });
    }
  };
}
```

For high-throughput scenarios, prefer streaming-based approaches or specialized middleware instead of buffering files fully in memory

## Secure File Storage Strategies

### Local Storage with Security Considerations

```typescript
// src/utils/fileStorage.ts
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface StorageOptions {
  uploadDir: string;
  maxFileSize: number;
  allowedExtensions: string[];
}

export class LocalFileStorage {
  constructor(private options: StorageOptions) {
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    await fs.mkdir(this.options.uploadDir, { recursive: true });

    // Add .gitignore to prevent accidental commits
    const gitignorePath = path.join(this.options.uploadDir, ".gitignore");
    try {
      await fs.access(gitignorePath);
    } catch {
      await fs.writeFile(gitignorePath, "*\n!.gitignore");
    }
  }

  async saveFile(
    file: File,
    userId?: string,
  ): Promise<{
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimeType: string;
  }> {
    // Generate secure filename
    const extension = this.getFileExtension(file.name);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString("hex");
    const safeFilename = `${timestamp}-${randomString}.${extension}`;

    // Create user-specific subdirectory for better organization
    const userDir = userId
      ? path.join(this.options.uploadDir, userId)
      : this.options.uploadDir;

    await fs.mkdir(userDir, { recursive: true });

    const filePath = path.join(userDir, safeFilename);

    // Write file
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return {
      filename: safeFilename,
      originalName: file.name,
      path: filePath,
      size: file.size,
      mimeType: file.type,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete file ${filePath}:`, error.message);
    }
  }

  async getFileStream(filePath: string) {
    return fs.createReadStream(filePath);
  }

  private getFileExtension(filename: string): string {
    const extension = path.extname(filename).toLowerCase().slice(1);

    // Validate extension is allowed
    if (!this.options.allowedExtensions.includes(`.${extension}`)) {
      throw new Error(`File extension .${extension} not allowed`);
    }

    return extension;
  }

  // Clean up old temporary files
  async cleanupOldFiles(maxAgeHours: number = 24) {
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

    const files = await fs.readdir(this.options.uploadDir);

    for (const file of files) {
      const filePath = path.join(this.options.uploadDir, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
        await this.deleteFile(filePath);
      }
    }
  }
}
```

### Cloud Storage Integration (AWS S3 Example)

```typescript
// src/utils/s3Storage.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3FileStorage {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET!;
  }

  async uploadFile(
    file: File,
    options: {
      userId?: string;
      folder?: string;
      isPublic?: boolean;
    } = {},
  ) {
    const key = this.generateKey(file.name, options);
    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
      ACL: options.isPublic ? "public-read" : "private",
    });

    await this.s3Client.send(command);

    return {
      key,
      url: this.getFileUrl(key, options.isPublic),
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    };
  }

  async generatePresignedUrl(key: string, expiresIn: number = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private generateKey(filename: string, options: any): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(filename);
    const safeName = path
      .basename(filename, extension)
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    let key = `${safeName}-${timestamp}-${randomString}${extension}`;

    if (options.userId) {
      key = `users/${options.userId}/${key}`;
    }

    if (options.folder) {
      key = `${options.folder}/${key}`;
    }

    return key;
  }

  private getFileUrl(key: string, isPublic?: boolean): string {
    if (isPublic) {
      return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }

    // For private files, clients will need to request a presigned URL
    return `/api/files/${key}/download`;
  }
}
```

## Image Processing and Optimization

Process uploaded images for better performance:

```typescript
// src/utils/imageProcessor.ts
import sharp from "sharp";

export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  };
  quality?: number;
  format?: "jpeg" | "png" | "webp";
  grayscale?: boolean;
}

export class ImageProcessor {
  async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {},
  ): Promise<{
    buffer: Buffer;
    format: string;
    width: number;
    height: number;
    size: number;
  }> {
    let image = sharp(buffer);

    // Get original metadata
    const metadata = await image.metadata();

    // Apply transformations
    if (options.resize) {
      image = image.resize(options.resize);
    }

    if (options.grayscale) {
      image = image.grayscale();
    }

    // Set output format and quality
    const format = options.format || metadata.format || "jpeg";
    const quality = options.quality || 80;

    switch (format) {
      case "jpeg":
        image = image.jpeg({ quality });
        break;
      case "png":
        image = image.png({ quality });
        break;
      case "webp":
        image = image.webp({ quality });
        break;
    }

    // Process image
    const processedBuffer = await image.toBuffer();
    const processedMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      format,
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
      size: processedBuffer.length,
    };
  }

  async generateThumbnail(buffer: Buffer, size: number = 200): Promise<Buffer> {
    return sharp(buffer)
      .resize(size, size, { fit: "cover" })
      .jpeg({ quality: 70 })
      .toBuffer();
  }

  async extractDominantColor(buffer: Buffer): Promise<string> {
    const { dominant } = await sharp(buffer)
      .resize(100, 100)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert RGB to hex
    const [r, g, b] = dominant;
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
}
```

## Complete File Upload Endpoint

Here's a complete, production-ready file upload endpoint:

```typescript
// src/api/files/route.ts
import { Request } from "@syntay/fastay";
import { fileUploadMiddleware } from "../../middlewares/fileUpload";
import { LocalFileStorage } from "../../utils/fileStorage";
import { ImageProcessor } from "../../utils/imageProcessor";

// Configure file storage
const fileStorage = new LocalFileStorage({
  uploadDir: path.join(process.cwd(), "uploads"),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx"],
});

const imageProcessor = new ImageProcessor();

// Apply file upload middleware to this route
export const middleware = {
  "/api/files": [
    fileUploadMiddleware({
      maxSize: 10 * 1024 * 1024,
      allowedTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      maxFiles: 10,
      fieldName: "files",
    }),
  ],
};

// POST /api/files - Upload files
export async function POST(request: Request) {
  try {
    const files = request.files || [];
    const userId = request.user?.id;
    const uploadResults = [];

    for (const file of files) {
      // Check if file is an image that needs processing
      if (file.type.startsWith("image/")) {
        const originalBuffer = Buffer.from(await file.arrayBuffer());

        // Process main image (optimized version)
        const processedImage = await imageProcessor.processImage(
          originalBuffer,
          {
            resize: { width: 1920 }, // Max width 1920px
            quality: 85,
            format: "webp",
          },
        );

        // Generate thumbnail
        const thumbnailBuffer =
          await imageProcessor.generateThumbnail(originalBuffer);

        // Save processed image
        const processedFile = new File(
          [processedImage.buffer],
          file.name.replace(/\.[^/.]+$/, ".webp"),
          { type: "image/webp" },
        );

        const savedFile = await fileStorage.saveFile(processedFile, userId);

        // Save thumbnail
        const thumbnailFile = new File(
          [thumbnailBuffer],
          `thumb-${savedFile.filename}`,
          { type: "image/jpeg" },
        );

        const savedThumbnail = await fileStorage.saveFile(
          thumbnailFile,
          userId,
        );

        // Extract dominant color for UI
        const dominantColor =
          await imageProcessor.extractDominantColor(originalBuffer);

        uploadResults.push({
          originalName: file.name,
          processedName: savedFile.filename,
          thumbnailName: savedThumbnail.filename,
          size: savedFile.size,
          type: savedFile.mimeType,
          dominantColor,
          dimensions: {
            width: processedImage.width,
            height: processedImage.height,
          },
          url: `/uploads/${userId ? `${userId}/` : ""}${savedFile.filename}`,
          thumbnailUrl: `/uploads/${userId ? `${userId}/` : ""}${savedThumbnail.filename}`,
          uploadedAt: new Date().toISOString(),
        });
      } else {
        // Non-image file - save as-is
        const savedFile = await fileStorage.saveFile(file, userId);

        uploadResults.push({
          originalName: file.name,
          storedName: savedFile.filename,
          size: savedFile.size,
          type: savedFile.mimeType,
          url: `/uploads/${userId ? `${userId}/` : ""}${savedFile.filename}`,
          uploadedAt: new Date().toISOString(),
        });
      }
    }

    return {
      status: 201,
      body: {
        message: `${files.length} file(s) uploaded successfully`,
        files: uploadResults,
      },
    };
  } catch (error) {
    console.error("File upload failed:", error);

    return {
      status: 500,
      body: {
        error: "UPLOAD_FAILED",
        message: "Failed to process file upload",
      },
    };
  }
}

// GET /api/files - List uploaded files for user
export async function GET(request: Request) {
  const userId = request.user?.id;

  if (!userId) {
    return {
      status: 401,
      body: {
        error: "UNAUTHORIZED",
        message: "Authentication required",
      },
    };
  }

  // In a real application, you would fetch from database
  // This is a simplified example
  return {
    body: {
      files: [], // Return list of user's files
    },
  };
}
```

## File Download Endpoint

Create secure download endpoints for uploaded files:

```typescript
// src/api/uploads/[filename]/route.ts
import { Request } from "@syntay/fastay";
import fs from "fs";
import path from "path";

// GET /api/uploads/:filename
export async function GET(request: Request) {
  const { filename } = request.params;
  const userId = request.user?.id;

  // Security: Validate filename doesn't contain path traversal
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return {
      status: 400,
      body: { error: "Invalid filename" },
    };
  }

  // Build file path
  const userDir = userId
    ? path.join(process.cwd(), "uploads", userId)
    : path.join(process.cwd(), "uploads");

  const filePath = path.join(userDir, filename);

  // Check if file exists
  try {
    await fs.promises.access(filePath);
  } catch {
    return {
      status: 404,
      body: { error: "File not found" },
    };
  }

  // Get file stats
  const stats = await fs.promises.stat(filePath);

  // Set appropriate headers
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Length": stats.size.toString(),
    "Cache-Control": "public, max-age=31536000", // Cache for 1 year
  };

  // Add Content-Disposition for download
  if (request.query.download === "true") {
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return {
    stream: fs.createReadStream(filePath),
    headers,
  };
}
```

## Security Considerations

### File Upload Security Checklist

1. **Validate file types**: Check both MIME type and file extension
2. **Limit file size**: Prevent denial of service through large uploads
3. **Sanitize filenames**: Prevent path traversal attacks
4. **Scan for viruses**: Implement virus scanning for uploaded files
5. **Use secure storage**: Store files outside web root or use cloud storage
6. **Implement access controls**: Restrict file access by user
7. **Set appropriate permissions**: File system permissions should be restrictive
8. **Regular cleanup**: Remove orphaned or temporary files
9. **Use HTTPS**: Encrypt file transfers
10. **Rate limit uploads**: Prevent abuse through excessive uploads

### Virus Scanning Integration

```typescript
// src/utils/virusScanner.ts
export async function scanFileForViruses(filePath: string): Promise<boolean> {
  // In production, integrate with ClamAV or similar
  // This is a simplified example

  const suspiciousPatterns = [
    /eval\(/i,
    /base64_decode/i,
    /system\(/i,
    /exec\(/i,
    /shell_exec\(/i,
  ];

  // Read first few KB of file
  const buffer = await fs.readFile(filePath, { end: 10240 });
  const content = buffer.toString("utf8", 0, Math.min(buffer.length, 10240));

  // Check for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return false; // File appears suspicious
    }
  }

  return true; // File appears clean
}
```

## Testing File Uploads

Test your file upload endpoints:

```typescript
// tests/fileUpload.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "@syntay/fastay";
import fs from "fs/promises";
import path from "path";

describe("File Upload API", () => {
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    const result = await createApp({
      apiDir: "./src/api",
      baseRoute: "/api",
      port: 0,
      mode: "test",
    });
    app = result.app;
  });

  it("uploads a single file", async () => {
    // Create a test file
    const testFilePath = path.join(__dirname, "test-image.jpg");
    await fs.writeFile(testFilePath, Buffer.from("fake image data"));

    const response = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("files", testFilePath)
      .expect(201);

    expect(response.body.files).toHaveLength(1);
    expect(response.body.files[0].url).toBeDefined();

    // Clean up
    await fs.unlink(testFilePath);
  });

  it("rejects files that are too large", async () => {
    // Create a large test file (11MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, "x");
    const testFilePath = path.join(__dirname, "large-file.jpg");
    await fs.writeFile(testFilePath, largeBuffer);

    const response = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("files", testFilePath)
      .expect(400);

    expect(response.body.error).toBe("VALIDATION_ERROR");

    await fs.unlink(testFilePath);
  });

  it("rejects disallowed file types", async () => {
    const testFilePath = path.join(__dirname, "test.exe");
    await fs.writeFile(testFilePath, Buffer.from("executable content"));

    const response = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("files", testFilePath)
      .expect(400);

    expect(response.body.error).toBe("VALIDATION_ERROR");

    await fs.unlink(testFilePath);
  });
});
```

## Performance Optimization

For high-volume file uploads:

1. **Use streaming**: Process files as streams rather than loading entire files into memory
2. **Implement chunked uploads**: Support resumable uploads for large files
3. **Use CDN**: Serve static files through a CDN
4. **Compress images**: Automatically compress uploaded images
5. **Implement caching**: Cache processed thumbnails and optimized versions
6. **Use background processing**: Process files asynchronously in the background

File uploads are a common requirement for modern applications. By following these patterns, you can implement secure, efficient file handling in your Fastay applications that scales from simple uploads to complex media processing pipelines.
