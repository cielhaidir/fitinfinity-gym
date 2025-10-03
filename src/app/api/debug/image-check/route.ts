import { NextRequest, NextResponse } from 'next/server';
import { existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imagePath = searchParams.get('path');
  
  if (!imagePath) {
    return NextResponse.json({ error: 'No image path provided' }, { status: 400 });
  }

  try {
    // Decode the URL-encoded path
    const decodedPath = decodeURIComponent(imagePath);
    
    // Check multiple possible locations for the image
    const possiblePaths = [
      join(process.cwd(), 'public', decodedPath),
      join('/app/public', decodedPath),
      decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`,
    ];

    const results = [];
    
    for (const path of possiblePaths) {
      const result = {
        path,
        exists: false,
        isFile: false,
        size: null as number | null,
        isReadable: false,
        error: null as string | null
      };

      try {
        result.exists = existsSync(path);
        if (result.exists) {
          const stats = statSync(path);
          result.isFile = stats.isFile();
          result.size = stats.size;
          
          // Try to read first few bytes to check readability
          try {
            readFileSync(path, { encoding: null });
            result.isReadable = true;
          } catch (readError: any) {
            result.error = `Read error: ${readError?.message || 'Unknown read error'}`;
          }
        }
      } catch (error: any) {
        result.error = error?.message || 'Unknown error';
      }
      
      results.push(result);
    }

    // Additional environment info
    const envInfo = {
      cwd: process.cwd(),
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      originalPath: imagePath,
      decodedPath,
    };

    return NextResponse.json({
      message: 'Image path debug information',
      envInfo,
      pathChecks: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace'
    }, { status: 500 });
  }
}