"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    phone: "",
    birthDate: new Date().toISOString().split("T")[0],
    fcReferralCode: "",
  });
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [fcError, setFcError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { refetch: checkFC } = api.fc.findByReferralCode.useQuery(
    { referralCode: formData.fcReferralCode },
    { enabled: false },
  );

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      setPasswordError("Passwords do not match");
    } else {
      setPasswordError("");
    }
  }, [formData.password, formData.confirmPassword]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters
    const numbersOnly = value.replace(/\D/g, "");

    // If the value starts with 62, remove it as we'll add it as prefix
    const cleanNumber = numbersOnly.startsWith("62")
      ? numbersOnly.slice(2)
      : numbersOnly;

    // Validate length before adding prefix
    if (cleanNumber.length > 0 && cleanNumber.length < 10) {
      setError("Phone number must be at least 10 digits");
    } else {
      setError("");
    }

    // Add 62 prefix if not empty
    const finalNumber = cleanNumber ? "62" + cleanNumber : "";

    setFormData((prev) => ({
      ...prev,
      phone: finalNumber,
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
    { enabled: false },
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); // Clear error when user types
    setFcError(""); // Clear FC error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate phone number format (excluding the 62 prefix)
    const numberWithoutPrefix = formData.phone.replace("62", "");
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

      // If FC referral code is provided, validate it
      let fcId = null;
      if (formData.fcReferralCode) {
        try {
          const { data: fc } = await checkFC();
          fcId = fc?.id;
        } catch (error) {
          setFcError("Invalid FC referral code");
          return;
        }
      }

      await createUserMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        address: formData.address,
        phone: formData.phone,
        birthDate: formData.birthDate
          ? new Date(formData.birthDate)
          : undefined,
        fcId: fcId ? fcId : "",
      });
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  const handleGoogleSignUp = () => {
    signIn("google");
  };

  return (
    <div className="flex min-h-screen dark:bg-background">
      {/* Left side - gray area (hidden on mobile) */}
      <div className="hidden bg-gray-200 dark:bg-gray-800 md:block md:flex-1"></div>

      {/* Right side - signup form */}
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

          {/* Sign Up Form Container */}
          <div className="flex flex-1 items-center">
            <div className="w-full">
              <h1 className="mb-8 text-3xl font-bold dark:text-white">
                Sign Up
              </h1>

              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {error && <p className="text-sm text-red-500">{error}</p>}

                  {/* Name Field */}
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
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
                    <label
                      htmlFor="email"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
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
                    <label
                      htmlFor="password"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="********"
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
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="********"
                        required
                        className={
                          passwordError
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1 text-sm text-red-500">
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Address Field */}
                  <div>
                    <label
                      htmlFor="address"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
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
                    <label
                      htmlFor="phone"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Phone
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500">+62</span>
                      </div>
                      <Input
                        type="tel"
                        name="phone"
                        value={formData.phone.replace("62", "")}
                        onChange={handlePhoneChange}
                        placeholder="8xxxxxxxxxx"
                        className="pl-12"
                        maxLength={12}
                      />
                    </div>
                  </div>

                  {/* Birth Date Field */}
                  <div>
                    <label
                      htmlFor="birthDate"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Birth Date
                    </label>
                    <Input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      className="[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                    />
                  </div>

                  {/* FC Referral Code Field */}
                  <div>
                    <label
                      htmlFor="fcReferralCode"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      FC Referral Code (Optional)
                    </label>
                    <Input
                      type="text"
                      name="fcReferralCode"
                      value={formData.fcReferralCode}
                      onChange={handleChange}
                      placeholder="Enter FC referral code"
                    />
                    {fcError && (
                      <p className="mt-1 text-sm text-red-500">{fcError}</p>
                    )}
                  </div>

                  {/* Sign Up Button */}
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[#BAD45E] px-4 py-2 text-center font-bold hover:bg-[#95B640] dark:text-gray-900"
                  >
                    Sign up
                  </button>

                  {/* Google Sign Up Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    className="flex w-full items-center justify-center space-x-2 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                  >
                    <img
                      src="/assets/google-lime.png"
                      alt="google-icon"
                      className="h-5 w-5"
                    />
                    <span>Sign up with Google</span>
                  </button>
                </div>
              </form>

              {/* Login link */}
              <p className="mt-6 text-sm dark:text-gray-300">
                Have a Account?{" "}
                <a
                  href="/auth/signin"
                  className="text-[#95B640] hover:underline"
                >
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
