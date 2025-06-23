import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { version: string } }
) {
  try {
    const version = params.version;
    
    // Validate version format (basic security check)
    if (!/^[a-zA-Z0-9._-]+$/.test(version)) {
      return NextResponse.json(
        { error: 'Invalid version format' },
        { status: 400 }
      );
    }

    const firmwarePath = path.join(process.cwd(), 'firmware', `${version}.bin`);
    
    if (!fs.existsSync(firmwarePath)) {
      return NextResponse.json(
        { error: 'Firmware version not found' },
        { status: 404 }
      );
    }
    
    const firmware = fs.readFileSync(firmwarePath);
    
    return new NextResponse(firmware, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': firmware.length.toString(),
        'Content-Disposition': `attachment; filename="${version}.bin"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'ETag': `"${version}"`,
        'Last-Modified': fs.statSync(firmwarePath).mtime.toUTCString(),
      }
    });
  } catch (error) {
    console.error('Error serving firmware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle HEAD requests for firmware info
export async function HEAD(
  request: NextRequest,
  { params }: { params: { version: string } }
) {
  try {
    const version = params.version;
    
    if (!/^[a-zA-Z0-9._-]+$/.test(version)) {
      return new NextResponse(null, { status: 400 });
    }

    const firmwarePath = path.join(process.cwd(), 'firmware', `${version}.bin`);
    
    if (!fs.existsSync(firmwarePath)) {
      return new NextResponse(null, { status: 404 });
    }
    
    const stats = fs.statSync(firmwarePath);
    
    return new NextResponse(null, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${version}.bin"`,
        'ETag': `"${version}"`,
        'Last-Modified': stats.mtime.toUTCString(),
      }
    });
  } catch (error) {
    console.error('Error getting firmware info:', error);
    return new NextResponse(null, { status: 500 });
  }
}