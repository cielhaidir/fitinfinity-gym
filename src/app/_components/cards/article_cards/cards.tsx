import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";

export default function Cards() {
  return (
    <Card className="h-[350px] w-[250px] flex-shrink-0 transform cursor-pointer shadow-lg transition-transform hover:scale-105 md:mx-2 md:h-[350px] md:w-[300px]">
      <CardContent className="p-4">
        <img
          src="https://fakeimg.pl/1080x1080"
          alt="Card Image"
          className="h-32 w-full rounded-lg object-cover md:h-40"
        />
        <div className="mt-4">
          <CardTitle className="line-clamp-2 text-lg font-bold">
            Jago banget
          </CardTitle>
          <p className="mt-1 text-xs text-gray-500">24/11/2024</p>
          <CardDescription className="mt-2 line-clamp-3 text-sm">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Odit fugit,
            mollitia corporis cum nemo natus error quas voluptatem, aliquid
            laboriosam totam dolores, eius ipsam culpa! Nesciunt debitis odio ab
            rerum.
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  );
}
