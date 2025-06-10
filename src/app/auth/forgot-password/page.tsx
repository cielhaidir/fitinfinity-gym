"use client";

import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleGmailVerification = () => {
    router.push("/auth/forgot-password/gmail-verification");
  };

  const handleWhatsappVerification = () => {
    router.push("/auth/forgot-password/whatsapp-verification");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Logo - Fixed at top right */}
      <div className="flex w-full justify-end p-4 md:p-6">
        <img src="/assets/fitinfinity-lime.png" alt="Logo" className="h-8" />
      </div>

      {/* Forgot Password Container */}
      <div className="flex flex-1 items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px]">
          <h1 className="mb-4 text-3xl font-bold dark:text-white">
            Forget Password?
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-300">
            Choose verification method to reset your password
          </p>

          <div className="space-y-4">
            {/* Gmail Verification Button */}
            <button
              onClick={handleGmailVerification}
              className="flex w-full items-center justify-center space-x-2 rounded-md border-2 border-[#BAD45E] px-4 py-2 text-[#95B640] hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <img
                src="/assets/google-lime.png"
                alt="Gmail"
                className="h-5 w-5"
              />
              <span>Send verification in Email</span>
            </button>

            {/* Whatsapp Verification Button */}
            <button
              onClick={handleWhatsappVerification}
              className="flex w-full items-center justify-center space-x-2 rounded-md bg-[#BAD45E] px-4 py-2 text-center text-white hover:bg-[#95B640]"
            >
              <img
                src="/assets/whatsapp-white.png"
                alt="Whatsapp"
                className="h-5 w-5"
              />
              <span>Send verification in Whatsapp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
