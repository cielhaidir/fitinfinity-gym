"use client";
import React from "react";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment !== "");

  const shouldShowEllipsis = pathSegments.length > 2;
  const displaySegments = shouldShowEllipsis 
    ? pathSegments.slice(-2) 
    : pathSegments;

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap sm:flex-wrap">
        {shouldShowEllipsis && (
          <>
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        {displaySegments.map((segment, index) => {
          const originalIndex = shouldShowEllipsis 
            ? pathSegments.length - displaySegments.length + index 
            : index;
          const href = `/${pathSegments.slice(0, originalIndex + 1).join("/")}`;
          const isLast = originalIndex === pathSegments.length - 1;

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="truncate max-w-[120px] sm:max-w-none">
                    {segment}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href} className="truncate max-w-[120px] sm:max-w-none">
                    {segment}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

