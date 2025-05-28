"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const resetPassword = api.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successful");
      router.push("/auth/signin");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Verify token on mount
  api.auth.verifyResetToken.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onSuccess: () => setIsTokenValid(true),
      onError: () => setIsTokenValid(false)
    }
  );

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;
    
    await resetPassword.mutateAsync({
      token,
      password: data.password
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
        <div className="flex-1 flex items-center justify-center px-4 md:px-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">Invalid Reset Link</h1>
            <p className="text-gray-600 dark:text-gray-300">
              This password reset link is invalid or has expired.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isTokenValid === false) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
        <div className="flex-1 flex items-center justify-center px-4 md:px-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">Link Expired</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              This password reset link has expired. Please request a new one.
            </p>
            <a 
              href="/auth/forgot-password/gmail-verification"
              className="text-[#BAD45E] hover:text-[#95B640] font-medium"
            >
              Request New Reset Link
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isTokenValid === null) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#BAD45E]"></div>
        </div>
      </div>
    );
  }

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

      {/* Form Container */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px]">
          <h1 className="text-3xl font-bold mb-4 dark:text-white">
            Reset Password
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                New Password
              </label>
              <input
                type="password"
                id="password"
                {...register("password")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                {...register("confirmPassword")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                required
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={resetPassword.isPending}
              className="w-full py-2 px-4 bg-[#BAD45E] hover:bg-[#95B640] text-center font-bold rounded-md dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {resetPassword.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}