import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron job
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Direct database query to deactivate expired subscriptions
    const now = new Date();
    const result = await db.subscription.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now },
      },
      data: {
        isActive: false,
      },
    });
    
    console.log(`[CRON] Deactivated ${result.count} expired subscriptions at ${new Date().toISOString()}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully deactivated ${result.count} expired subscriptions`,
      count: result.count,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[CRON] Error deactivating expired subscriptions:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to deactivate expired subscriptions",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Use POST method to run the cron job",
    endpoint: "/api/cron/deactivate-expired-subscriptions",
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_CRON_SECRET_TOKEN"
    }
  });
} 