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
    <Card className="w-[250px] h-[350px] flex-shrink-0 cursor-pointer transition-transform transform hover:scale-105 md:mx-2 md:w-[300px] md:h-[350px] shadow-lg">
      <CardContent className="p-4">
        <img
          src="https://fakeimg.pl/1080x1080"
          alt="Card Image"
          className="w-full h-32 md:h-40 object-cover rounded-lg"
        />
        <div className="mt-4">
          <CardTitle className="text-lg font-bold line-clamp-2">
            Jago banget
          </CardTitle>
          <p className="text-gray-500 text-xs mt-1">24/11/2024</p>
          <CardDescription className="text-sm mt-2 line-clamp-3">
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
