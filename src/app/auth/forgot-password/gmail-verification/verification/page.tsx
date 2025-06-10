"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerificationInstructionsPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Logo - Fixed at top right */}
      <div className="flex w-full justify-end p-4 md:p-6">
        <img src="/assets/fitinfinity-lime.png" alt="Logo" className="h-8" />
      </div>

      {/* Content Container */}
      <div className="flex flex-1 items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px] text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-12 w-12 text-[#BAD45E]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
              />
            </svg>
          </div>

          <h1 className="mb-4 text-3xl font-bold dark:text-white">
            Check Your Email
          </h1>

          {email && (
            <p className="mb-2 text-gray-600 dark:text-gray-300">
              We've sent a password reset link to:
              <br />
              <span className="font-medium text-gray-900 dark:text-white">
                {email}
              </span>
            </p>
          )}

          <p className="mb-8 text-gray-600 dark:text-gray-300">
            Click the link in the email to reset your password. If you don't see
            the email, check your spam folder.
          </p>

          <Link
            href="/auth/signin"
            className="inline-block font-medium text-[#BAD45E] hover:text-[#95B640]"
          >
            Back to Sign In
          </Link>

          <div className="mt-8 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Didn't receive the email?
              <br />
              Check your spam folder or{" "}
              <Link
                href="/auth/forgot-password/gmail-verification"
                className="text-[#BAD45E] hover:text-[#95B640]"
              >
                try another email address
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
