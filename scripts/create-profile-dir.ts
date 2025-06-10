import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const profileDir = join(process.cwd(), "public", "assets", "profile");

if (!existsSync(profileDir)) {
  mkdirSync(profileDir, { recursive: true });
  console.log("Created profile directory:", profileDir);
} else {
  console.log("Profile directory already exists:", profileDir);
}
