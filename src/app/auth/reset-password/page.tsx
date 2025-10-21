"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetPassword = api.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successful");
      router.push("/auth/signin");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Verify token on mount
  api.auth.verifyResetToken.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onSuccess: () => setIsTokenValid(true),
      onError: () => setIsTokenValid(false),
    },
  );

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    await resetPassword.mutateAsync({
      token,
      password: data.password,
    });
  };

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
        <div className="flex flex-1 items-center justify-center px-4 md:px-6">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold dark:text-white">
              Invalid Reset Link
            </h1>
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
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
        <div className="flex flex-1 items-center justify-center px-4 md:px-6">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold dark:text-white">
              Link Expired
            </h1>
            <p className="mb-8 text-gray-600 dark:text-gray-300">
              This password reset link has expired. Please request a new one.
            </p>
            <a
              href="/auth/forgot-password/gmail-verification"
              className="font-medium text-[#BAD45E] hover:text-[#95B640]"
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
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#BAD45E]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      {/* Logo - Fixed at top right */}
      <div className="flex w-full justify-end p-4 md:p-6">
        <img src="/assets/fitinfinity-lime.png" alt="Logo" className="h-8" />
      </div>

      {/* Form Container */}
      <div className="flex flex-1 items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-[500px]">
          <h1 className="mb-4 text-3xl font-bold dark:text-white">
            Reset Password
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-300">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  {...register("password")}
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  {...register("confirmPassword")}
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={resetPassword.isPending}
              className="flex w-full items-center justify-center rounded-md bg-[#BAD45E] px-4 py-2 text-center font-bold hover:bg-[#95B640] disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-900"
            >
              {resetPassword.isPending ? (
                <>
                  <svg
                    className="-ml-1 mr-3 h-5 w-5 animate-spin text-gray-900"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
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
