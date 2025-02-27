"use client";

import { useState } from "react";

export default function GmailVerificationCodePage() {
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Logo - Fixed at top right */}
      <div className="w-full flex justify-end p-4 md:p-6">
        <img 
          src="/assets/fitinfinity-lime.png" 
          alt="Logo" 
          className="h-8"
        />
      </div>

      {/* Verification Code Form Container */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px]">
          <h1 className="text-3xl font-bold mb-4 dark:text-white">
            Enter Your Verification Code
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            We've sent a 6-digit verification code to your Email. Enter it below to proceed.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Verification Code Field */}
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit verification code"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#BAD45E] hover:bg-[#95B640] text-center font-bold rounded-md dark:text-gray-900"
              >
                Send Verification Code
              </button>

              {/* Resend Link */}
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                Didn't receive the code?{' '}
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
