"use client";

import { useRouter } from "next/navigation";

export default function ResetPasswordSuccessPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/auth/signin");
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

      {/* Success Message Container */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px] text-center">
          <h1 className="text-3xl font-bold mb-4 dark:text-white">
            Reset Password Succesfull
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Your password has been successfully updated! You can now
            log in with your new password.
          </p>

          {/* Login Link */}
          <button
            onClick={handleLogin}
            className="text-[#BAD45E] hover:text-[#95B640] font-medium"
          >
            Click here to login!
          </button>
        </div>
      </div>
    </div>
  );
}
