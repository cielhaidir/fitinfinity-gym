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

  // More aggressive mobile optimization
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const shouldShowEllipsis = pathSegments.length > (isMobile ? 1 : 2);
  const displaySegments = shouldShowEllipsis
    ? pathSegments.slice(-1) // Show only last segment on mobile
    : pathSegments;

  // Format segment names for better readability
  const formatSegment = (segment: string) => {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="hidden sm:block"> {/* Hide completely on mobile */}
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap">
          {shouldShowEllipsis && (
            <>
              <BreadcrumbItem>
                <BreadcrumbEllipsis className="h-4 w-4" />
              </BreadcrumbItem>
              <BreadcrumbSeparator className="h-4 w-4" />
            </>
          )}
          {displaySegments.map((segment, index) => {
            const originalIndex = shouldShowEllipsis
              ? pathSegments.length - displaySegments.length + index
              : index;
            const href = `/${pathSegments.slice(0, originalIndex + 1).join("/")}`;
            const isLast = originalIndex === pathSegments.length - 1;
            const formattedSegment = formatSegment(segment);

            return (
              <React.Fragment key={href}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-sm font-medium truncate max-w-[150px] lg:max-w-none">
                      {formattedSegment}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground truncate max-w-[120px] lg:max-w-none transition-colors"
                    >
                      {formattedSegment}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator className="h-4 w-4" />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

