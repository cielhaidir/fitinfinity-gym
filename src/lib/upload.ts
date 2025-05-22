import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"

export async function uploadFile(base64Data: string, fileName: string): Promise<string> {
  try {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:.*?;base64,/, "")
    const buffer = Buffer.from(base64String, "base64")

    // Generate a unique filename
    const extension = path.extname(fileName)
    const uniqueFilename = `${uuidv4()}${extension}`
    
    // Construct the path relative to the public directory
    const relativeUploadDir = path.join("assets", "management", "transaction")
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