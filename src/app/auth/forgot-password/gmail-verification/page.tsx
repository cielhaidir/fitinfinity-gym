"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function GmailVerificationPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const sendResetEmail = api.email.sendPasswordResetEmail.useMutation({
    onSuccess: () => {
      // Always show success even if email doesn't exist (for security)
      toast.success("If an account exists with this email, you will receive a password reset link.");
      router.push(`/auth/forgot-password/gmail-verification/verification?email=${encodeURIComponent(email)}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await sendResetEmail.mutateAsync({
        email,
        resetBaseUrl: `${window.location.origin}/auth/reset-password`,
      });
    } catch (error) {
      // Error is handled by onError above
    }
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

      {/* Verification Form Container */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px]">
          <h1 className="text-3xl font-bold mb-4 dark:text-white">
            Forget Password?
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Receive a verification code via Gmail to reset your password instantly.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              {/* Send Verification Code Button */}
              <button
                type="submit"
                disabled={sendResetEmail.isPending}
                className="w-full py-2 px-4 bg-[#BAD45E] hover:bg-[#95B640] text-center font-bold rounded-md dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {sendResetEmail.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
