import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";
import { sanitizeForLogging } from "./sanitizer";

// Pastikan direktori logs tersedia
const logDirectory = path.resolve("logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

export const createModelLogger = (modelName: string) => {
  // Generate monthly log filename: modelName-YYYY-MM.log
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed, pad to 2 digits
  const monthlyFilename = `${modelName}-${year}-${month}.log`;
  const modelLogPath = path.join(logDirectory, monthlyFilename);

  return createLogger({
    level: "info", // Log level
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf(({ level, message, timestamp, ...metadata }) => {
        // Check if there's any metadata beyond the standard fields
        const hasMetadata = Object.keys(metadata).length > 0;
        
        if (hasMetadata) {
          // Sanitize metadata for safe JSON serialization
          const sanitized = sanitizeForLogging(metadata);
          return `[${timestamp}] ${level.toUpperCase()}: ${message} | ${JSON.stringify(sanitized)}`;
        }
        
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      }),
    ),
    transports: [new transports.File({ filename: modelLogPath })],
  });
};
