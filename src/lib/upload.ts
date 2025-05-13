import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function uploadFile(base64String: string): Promise<string> {
  try {
    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "")
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64")
    
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `profile-${timestamp}.jpg`
    
    // Define the path where the file will be saved
    const publicDir = join(process.cwd(), "public", "assets", "profile")
    const filePath = join(publicDir, filename)
    
    // Create directory if it doesn't exist
    await mkdir(publicDir, { recursive: true })
    
    // Write the file
    await writeFile(filePath, buffer)
    
    // Return the public URL path
    return `/assets/profile/${filename}`
  } catch (error) {
    console.error("Upload error:", error)
    throw error
  }
}

export async function uploadPTPhoto(base64String: string): Promise<string> {
  try {
    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "")
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64")
    
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `pt-${timestamp}.jpg`
    
    // Define the path where the file will be saved
    const publicDir = join(process.cwd(), "public", "assets", "PT")
    const filePath = join(publicDir, filename)
    
    // Create directory if it doesn't exist
    await mkdir(publicDir, { recursive: true })
    
    // Write the file
    await writeFile(filePath, buffer)
    
    // Return the public URL path
    return `/assets/PT/${filename}`
  } catch (error) {
    console.error("Upload error:", error)
    throw error
  }
} 