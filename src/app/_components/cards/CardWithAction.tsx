import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CardWithAction() {
  return (
    <Card className="w-[350px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-2xl font-bold">Card Title</CardTitle>
          <CardDescription>Card description goes here</CardDescription>
        </div>
        <Button variant="ghost" className="rounded-full" size="icon">
          Action
        </Button>
      </CardHeader>
      <CardContent>
        <p>
          This is the main content of the card. You can put any information
          here.
        </p>
      </CardContent>
      <CardFooter>
        <p>Card footer content</p>
      </CardFooter>
    </Card>
  );
}
