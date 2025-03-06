"use client";

import { useState } from "react";

export default function WhatsappVerificationPage() {
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement verification code sending logic
    console.log("Sending verification code to:", whatsappNumber);
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
                  placeholder="+62 823 **** ****"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                  required
                  pattern="^\+?[1-9]\d{1,14}$"
                />
              </div>

              {/* Send Verification Code Button */}
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#BAD45E] hover:bg-[#95B640] text-center font-bold rounded-md dark:text-gray-900"
              >
                Send Verification Code
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
