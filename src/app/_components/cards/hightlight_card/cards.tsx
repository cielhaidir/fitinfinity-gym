import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "../../ui/button";
import { Badge } from "@/components/ui/badge";
import { BriefcaseBusiness, ThumbsUp } from "lucide-react";

export default function Cards() {
  return (
    <Card className="w-[250px] flex-shrink-0 md:mx-2 md:w-[300px]">
      <CardContent className="p-6">
        <img
          src="https://fakeimg.pl/1080x1080"
          alt="Card Image"
          className="rounded-lg"
        />
        <CardTitle className="mt-4 text-lg font-bold">Dr. Testing</CardTitle>
        <CardDescription className="text-sm">Data Analyst</CardDescription>
        <div className="my-4 flex space-x-2">
          <Badge className="mr-2 flex items-center rounded-xl border-2 border-blue-600 bg-white text-blue-600 dark:bg-blue-600 dark:text-white">
            <BriefcaseBusiness className="mr-1" /> Niggas
          </Badge>
          <Badge className="flex items-center rounded-xl border-2 border-blue-600 bg-white text-blue-600 dark:bg-blue-600 dark:text-white">
            <ThumbsUp className="mr-1" /> 88%
          </Badge>
        </div>
        <h2 className="text-xl font-bold">Rp.20000</h2>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button>Chat</Button>
      </CardFooter>
    </Card>
  );
}
