"use client";

import { useState } from "react";

export default function WhatsappVerificationCodePage() {
  const [verificationCode, setVerificationCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement verification code checking logic
    console.log("Verifying code:", verificationCode);
  };

  const handleResend = () => {
    // Implement resend verification code logic
    console.log("Resending verification code");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Logo - Fixed at top right */}
      <div className="flex w-full justify-end p-4 md:p-6">
        <img src="/assets/fitinfinity-lime.png" alt="Logo" className="h-8" />
      </div>

      {/* Verification Code Form Container */}
      <div className="flex flex-1 items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px]">
          <h1 className="mb-4 text-3xl font-bold dark:text-white">
            Enter Your Verification Code
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-300">
            We've sent a 6-digit verification code to your WhatsApp. Enter it
            below to proceed.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Verification Code Field */}
              <div>
                <label
                  htmlFor="verificationCode"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Verification Code
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit verification code"
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full rounded-md bg-[#BAD45E] px-4 py-2 text-center font-bold hover:bg-[#95B640] dark:text-gray-900"
              >
                Send Verification Code
              </button>

              {/* Resend Link */}
              <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-[#95B640] hover:underline"
                >
                  Resend
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
