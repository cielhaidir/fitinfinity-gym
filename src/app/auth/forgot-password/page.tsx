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
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Logo - Fixed at top right */}
      <div className="w-full flex justify-end p-4 md:p-6">
        <img 
          src="/assets/fitinfinity-lime.png" 
          alt="Logo" 
          className="h-8"
        />
      </div>

      {/* Forgot Password Container */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px]">
          <h1 className="text-3xl font-bold mb-4 dark:text-white">
            Forget Password?
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Choose verification method to reset your password
          </p>

          <div className="space-y-4">
            {/* Gmail Verification Button */}
            <button
              onClick={handleGmailVerification}
              className="w-full py-2 px-4 border-2 border-[#BAD45E] text-[#95B640] rounded-md flex items-center justify-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <img src="/assets/google-lime.png" alt="Gmail" className="w-5 h-5" />
              <span>Send verification in Gmail</span>
            </button>

            {/* Whatsapp Verification Button */}
            <button
              onClick={handleWhatsappVerification}
              className="w-full py-2 px-4 bg-[#BAD45E] hover:bg-[#95B640] text-white text-center rounded-md flex items-center justify-center space-x-2"
            >
              <img src="/assets/whatsapp-white.png" alt="Whatsapp" className="w-5 h-5" />
              <span>Send verification in Whatsapp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
