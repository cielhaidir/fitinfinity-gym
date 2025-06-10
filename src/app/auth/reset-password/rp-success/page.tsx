"use client";

import { useRouter } from "next/navigation";

export default function ResetPasswordSuccessPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/auth/signin");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Logo - Fixed at top right */}
      <div className="flex w-full justify-end p-4 md:p-6">
        <img src="/assets/fitinfinity-lime.png" alt="Logo" className="h-8" />
      </div>

      {/* Success Message Container */}
      <div className="flex flex-1 items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px] text-center">
          <h1 className="mb-4 text-3xl font-bold dark:text-white">
            Reset Password Succesfull
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-300">
            Your password has been successfully updated! You can now log in with
            your new password.
          </p>

          {/* Login Link */}
          <button
            onClick={handleLogin}
            className="font-medium text-[#BAD45E] hover:text-[#95B640]"
          >
            Click here to login!
          </button>
        </div>
      </div>
    </div>
  );
}
