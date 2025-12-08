import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { auth, signIn } from "@/server/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // This is a simplified example. In a real-world scenario, you would
    // want to handle sessions and authentication more securely.
    await signIn("credentials", {
      email: user.email,
      password: "", // Bypassing password check
      redirect: false,
    });

    return NextResponse.json({ message: "Bypass successful" });
  } catch (error) {
    console.error("Bypass error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
