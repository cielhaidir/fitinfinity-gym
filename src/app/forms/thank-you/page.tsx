"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') || 'Thank you!';
  const message = searchParams.get('message') || 'Your response has been recorded.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="text-center py-12">
            <div className="mb-6">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            </div>
            
            <CardTitle className="text-2xl font-bold text-gray-900 mb-4">
              {title}
            </CardTitle>
            
            <p className="text-gray-600 mb-8">
              {message}
            </p>
            
            <Link href="/">
              <Button className="w-full">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}