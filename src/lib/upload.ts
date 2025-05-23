import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"

export async function uploadFile(file: string, fileName: string) {
  try {
    // Validate input
    if (!file || !fileName) {
      throw new Error('File and fileName are required');
    }

    // Remove data URL prefix if present
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    
    // Generate a unique filename
    const extension = path.extname(fileName) || '.jpg'; // Default to .jpg if no extension
    const uniqueFilename = `${uuidv4()}${extension}`;
    
    // Construct the path relative to the public directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, uniqueFilename);
    
    // Convert base64 to buffer and write to file
    const buffer = Buffer.from(base64Data, 'base64');
    await writeFile(filePath, buffer);
    
    // Return the public URL path
    return `/uploads/${uniqueFilename}`;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function uploadPTPhoto(base64Data: string): Promise<string> {
  try {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:.*?;base64,/, "")
    const buffer = Buffer.from(base64String, "base64")

    // Generate a unique filename
    const uniqueFilename = `${uuidv4()}.jpg`
    
    // Construct the path relative to the public directory
    const relativeUploadDir = path.join("assets", "pt")
    const uploadDir = path.join(process.cwd(), "public", relativeUploadDir)
    const filePath = path.join("/", relativeUploadDir, uniqueFilename)

    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true })

    // Write the file
    await writeFile(path.join(uploadDir, uniqueFilename), buffer)

    return filePath
  } catch (error) {
    console.error("Upload error:", error)
    throw error
  }
} 