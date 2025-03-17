"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      // Redirect to home page on successful login
      router.push("/");
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", {
      callbackUrl: "/"
    });
  };

  return (
    <div className="min-h-screen flex dark:bg-background">
      {/* Left side - gray area (hidden on mobile) */}
      <div className="hidden md:block md:flex-1 bg-gray-200 dark:bg-gray-800"></div>
      
      {/* Right side - login form */}
      <div className="flex-1 md:w-[40%] bg-white dark:bg-gray-950">
        <div className="h-full flex flex-col p-4 md:p-6 max-w-[400px] mx-auto">
          {/* Logo */}
          <div className="flex justify-end mb-8">
            <img 
              src="/assets/fitinfinity-lime.png" 
              alt="Logo" 
              className="h-8"
            />
          </div>

          {/* Login Form Container */}
          <div className="flex-1 flex items-center">
            <div className="w-full">
              <h1 className="text-3xl font-bold mb-8 dark:text-white">Log In</h1>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                  
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
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Remember me and Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="remember"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <label htmlFor="remember" className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                        Remember me
                      </label>
                    </div>
                    <a href="/auth/forgot-password" className="text-sm text-[#95B640] hover:underline">
                      Forgot Password?
                    </a>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-[#BAD45E] hover:bg-[#95B640] text-center font-bold rounded-md dark:text-gray-900"
                  >
                    Login
                  </button>

                  {/* Google Login Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md flex items-center justify-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white"
                  >
                    <img src="/assets/google-lime.png" alt="google-icon" className="w-5 h-5" />
                    <span>Log in with Google</span>
                  </button>
                </div>
              </form>

              {/* Sign up link */}
              <p className="mt-6 text-sm dark:text-gray-300">
                Not have account yet?{' '}
                <a href="/auth/signup" className="text-[#95B640] hover:underline">
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

