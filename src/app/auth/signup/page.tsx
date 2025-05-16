"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    phone: "",
    birthDate: new Date().toISOString().split('T')[0], // Set initial value to today's date
  });
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match");
    } else {
      setPasswordError("");
    }
  }, [formData.password, formData.confirmPassword]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters
    const numbersOnly = value.replace(/\D/g, '');
    
    // If the value starts with 62, remove it as we'll add it as prefix
    const cleanNumber = numbersOnly.startsWith('62') ? numbersOnly.slice(2) : numbersOnly;
    
    // Validate length before adding prefix
    if (cleanNumber.length > 0 && cleanNumber.length < 10) {
      setError("Phone number must be at least 10 digits");
    } else {
      setError("");
    }
    
    // Add 62 prefix if not empty
    const finalNumber = cleanNumber ? '62' + cleanNumber : '';
    
    setFormData(prev => ({
      ...prev,
      phone: finalNumber
    }));
  };

  const createUserMutation = api.user.create.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully! Please sign in.");
      router.push("/auth/signin");
    },
    onError: (error) => {
      setError(error.message);
      toast.error(error.message);
    },
  });

  const { refetch: checkPhone } = api.profile.checkPhone.useQuery(
    { phone: formData.phone },
    { enabled: false } // Disable automatic query
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate phone number format (excluding the 62 prefix)
    const numberWithoutPrefix = formData.phone.replace('62', '');
    if (numberWithoutPrefix.length < 10) {
      setError("Phone number must be at least 10 digits");
      return;
    }

    try {
      // Check if phone number is already registered
      const { data: phoneExists } = await checkPhone();
      if (phoneExists) {
        setError("Phone number is already registered");
        return;
      }

      await createUserMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        address: formData.address,
        phone: formData.phone,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
      });
    } catch (error) {
      console.error("Signup error:", error);
    }
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
                  
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Name
                    </label>
                    <Input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Full Name"
                      required
                    />
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@example.com"
                      required
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Password
                    </label>
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="********"
                      required
                    />
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="********"
                      required
                      className={passwordError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {passwordError && (
                      <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                    )}
                  </div>

                  {/* Address Field */}
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Address
                    </label>
                    <Input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Address"
                    />
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">+62</span>
                      </div>
                      <Input
                        type="tel"
                        name="phone"
                        value={formData.phone.replace('62', '')}
                        onChange={handlePhoneChange}
                        placeholder="8xxxxxxxxxx"
                        className="pl-12"
                        maxLength={12}
                      />
                    </div>
                  </div>

                  {/* Birth Date Field */}
                  <div>
                    <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Birth Date
                    </label>
                    <Input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
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

