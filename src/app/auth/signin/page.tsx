"use client";

import { signIn, useSession } from "next-auth/react";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi dasar
    if (!email || !password) {
      setError("Email dan password harus diisi");
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Format email tidak valid");
      return;
    }

    // Validasi panjang password minimal
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email atau password salah. Silakan coba lagi.");
        return;
      }

      if (result?.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", {
      callbackUrl: "/",
    });
  };

  return (
    <div className="flex min-h-screen dark:bg-background">
      {/* Left side - gray area (hidden on mobile) */}
      <div className="hidden bg-gray-200 dark:bg-gray-800 md:block md:flex-1"></div>

      {/* Right side - login form */}
      <div className="flex-1 bg-white dark:bg-gray-950 md:w-[40%]">
        <div className="mx-auto flex h-full max-w-[400px] flex-col p-4 md:p-6">
          {/* Logo */}
          <div className="mb-8 flex justify-end">
            <img
              src="/assets/fitinfinity-lime.png"
              alt="Logo"
              className="h-8"
            />
          </div>

          {/* Login Form Container */}
          <div className="flex flex-1 items-center">
            <div className="w-full">
              <h1 className="mb-8 text-3xl font-bold dark:text-white">
                Log In
              </h1>

              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {error && <p className="text-sm text-red-500">{error}</p>}

                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@example.com"
                      className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                        className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me and Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="remember"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <label
                        htmlFor="remember"
                        className="ml-2 text-sm text-gray-700 dark:text-gray-200"
                      >
                        Remember me
                      </label>
                    </div>
                    <a
                      href="/auth/forgot-password"
                      className="text-sm text-[#95B640] hover:underline"
                    >
                      Forgot Password?
                    </a>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[#BAD45E] px-4 py-2 text-center font-bold hover:bg-[#95B640] dark:text-gray-900"
                  >
                    Login
                  </button>

                  {/* Google Login Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex w-full items-center justify-center space-x-2 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                  >
                    <img
                      src="/assets/google-lime.png"
                      alt="google-icon"
                      className="h-5 w-5"
                    />
                    <span>Log in with Google</span>
                  </button>
                </div>
              </form>

              {/* Sign up link */}
              <p className="mt-6 text-sm dark:text-gray-300">
                Not have account yet?{" "}
                <a
                  href="/auth/signup"
                  className="text-[#95B640] hover:underline"
                >
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
