"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export default function WhatsappVerificationPage() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [status, setStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");

  // Use the new sendResetPasswordLink procedure
  const resetMutation = api.whatsapp.sendResetPasswordLink.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await resetMutation.mutateAsync({ phone: whatsappNumber });
      setStatus("sent");
    } catch (err) {
      console.error(err);
      setStatus("error");
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
            Receive a verification code via WhatsApp to reset your password instantly.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* WhatsApp Number Field */}
              <div>
                <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  id="whatsappNumber"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+6281234567890"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                  required
                  pattern="^\+?[1-9]\d{1,14}$"
                />
              </div>

              {/* Send Reset Link Button */}
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full py-2 px-4 bg-[#BAD45E] hover:bg-[#95B640] font-bold rounded-md dark:text-gray-900"
              >
                {status === "sending" ? "Sending…" : "Send Reset Link"}
              </button>

              {/* Feedback */}
              {status === "sent" && <p className="text-green-600">Link sent via WhatsApp!</p>}
              {status === "error" && <p className="text-red-600">Failed to send link. Please try again.</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
