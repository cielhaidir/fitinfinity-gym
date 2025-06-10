import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

// Pastikan direktori logs tersedia
const logDirectory = path.resolve("logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

export const createModelLogger = (modelName: string) => {
  const modelLogPath = path.join(logDirectory, `${modelName}.log`);

  return createLogger({
    level: "info", // Log level
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf(({ level, message, timestamp }) => {
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      }),
    ),
    transports: [new transports.File({ filename: modelLogPath })],
  });
};
