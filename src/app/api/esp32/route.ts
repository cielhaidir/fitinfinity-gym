import { type NextApiRequest, type NextApiResponse } from "next";
import { createTRPCContext } from "../../../server/api/trpc";
import { appRouter, createCaller } from "../../../server/api/root";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

export async function POST(req: Request) {
  const ctx = await createTRPCContext({ headers: req.headers });
  const caller = createCaller(ctx);
  
  try {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json(
        { error: "Invalid JSON format in request body" },
        { status: 400 }
      );
    }
    
    const { action, ...data } = body;

    switch (action) {
      case "authenticate":
        return Response.json(await caller.esp32.authenticate(data));
        
      case "requestEnrollment":
        return Response.json(await caller.esp32.requestEnrollment(data));
        
      case "updateEnrollmentStatus":
        return Response.json(await caller.esp32.updateEnrollmentStatus(data));
        
      case "logFingerprint":
        return Response.json(await caller.esp32.logFingerprint(data));
        
      case "logRFID":
        return Response.json(await caller.esp32.logRFID(data));
        
      case "bulkLog":
        return Response.json(await caller.esp32.bulkLog(data));
  
      case "getPendingEnrollments":
        return Response.json(await caller.esp32.getPendingEnrollments(data));
        
      default:
        return Response.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (cause) {
    if (cause instanceof TRPCError) {
      const httpCode = getHTTPStatusCodeFromError(cause);
      return Response.json(cause, { status: httpCode });
    }
    console.error(cause);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const ctx = await createTRPCContext({ headers: req.headers });
  const caller = createCaller(ctx);

  try {
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId");
    const accessKey = url.searchParams.get("accessKey");

    if (!deviceId || !accessKey) {
      return Response.json(
        { error: "Missing deviceId or accessKey" },
        { status: 400 }
      );
    }

    return Response.json(
      await caller.esp32.getPendingEnrollments({ deviceId, accessKey })
    );
  } catch (cause) {
    if (cause instanceof TRPCError) {
      const httpCode = getHTTPStatusCodeFromError(cause);
      return Response.json(cause, { status: httpCode });
    }
    console.error(cause);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}