"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(""); // Clear error when user types
  };

  const validatePassword = (password: string) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword(formData.password)) {
      setError("Password must be at least 8 characters with a mix of letters, numbers, and symbols.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    // Handle form submission
    // Add your signup logic here
  };

  const handleGoogleSignUp = () => {
    signIn("google");
  };

  return (
    <div className="min-h-screen flex dark:bg-background">
      {/* Left side - gray area (hidden on mobile) */}
      <div className="hidden md:block md:flex-1 bg-gray-200 dark:bg-gray-800"></div>
      
      {/* Right side - signup form */}
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

          {/* Sign Up Form Container */}
          <div className="flex-1 flex items-center">
            <div className="w-full">
              <h1 className="text-3xl font-bold mb-8 dark:text-white">Sign Up</h1>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                  
                  {/* First Name and Last Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="First Name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Last Name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
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
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="********"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="********"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      It must be a combination of minimum 8 letters, numbers, and symbols.
                    </p>
                  </div>

                  {/* Sign Up Button */}
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-[#BAD45E] hover:bg-[#95B640] text-center font-bold rounded-md dark:text-gray-900"
                  >
                    Sign up
                  </button>

                  {/* Google Sign Up Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    className="w-full py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md flex items-center justify-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white"
                  >
                    <img src="/assets/google-lime.png" alt="google-icon" className="w-5 h-5" />
                    <span>Sign up with Google</span>
                  </button>
                </div>
              </form>

              {/* Login link */}
              <p className="mt-6 text-sm dark:text-gray-300">
                Have a Account?{' '}
                <a href="/auth/signin" className="text-[#95B640] hover:underline">
                  Login
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

