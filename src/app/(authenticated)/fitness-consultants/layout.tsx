import { type ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function FCLayout({ children }: LayoutProps) {
  return (
    <div className="flex h-full flex-col space-y-4 p-8">
      <div className="flex-1">{children}</div>
    </div>
  );
}
