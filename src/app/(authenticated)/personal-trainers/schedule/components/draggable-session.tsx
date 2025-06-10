import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState, useEffect } from "react";

interface DraggableSessionProps {
  session: {
    id: string;
    member: {
      user: {
        name: string;
      };
    };
    startTime: Date;
    endTime: Date;
    isCancelled?: boolean;
    status: "ENDED" | "NOT_YET" | "CANCELED" | "ONGOING";
    exerciseResult?: boolean;
  };
  onClick: (e: React.MouseEvent) => void;
  onResize: (sessionId: string, startHour: number, endHour: number) => void;
  cellHeight: number;
  isCancelled?: boolean;
}

export default function DraggableSession({
  session,
  onClick,
  onResize,
  cellHeight,
  isCancelled,
}: DraggableSessionProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: session.id,
      data: {
        ...session,
        startHour: new Date(session.startTime).getHours(),
        endHour: new Date(session.endTime).getHours(),
      },
    });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);

  const startHour = new Date(session.startTime).getHours();
  const endHour = new Date(session.endTime).getHours();
  const duration = endHour - startHour;

  const getStatusColor = () => {
    if (session.exerciseResult) {
      return "bg-blue-500 hover:bg-blue-600";
    }

    switch (session.status) {
      case "ENDED":
        return "bg-gray-500 hover:bg-gray-600";
      case "CANCELED":
        return "bg-destructive hover:bg-destructive/80";
      case "ONGOING":
        return "bg-yellow-500 hover:bg-yellow-600";
      default:
        return "bg-[#C9D953] hover:bg-[#b8c748]";
    }
  };

  const getStatusText = () => {
    if (session.exerciseResult) {
      return "Hasil Terupload";
    }

    switch (session.status) {
      case "ENDED":
        return "Selesai";
      case "CANCELED":
        return "Dibatalkan";
      case "ONGOING":
        return "Sedang Berlangsung";
      default:
        return "";
    }
  };

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    height: `${duration * cellHeight}px`,
    position: "absolute" as const,
    left: "4px",
    right: "4px",
    zIndex: isResizing || isDragging ? 50 : 1,
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartY(e.clientY);
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeStartY;
    const hourChange = Math.round(deltaY / cellHeight);
    const newEndHour = Math.min(
      Math.max(startHour + 1, endHour + hourChange),
      23,
    );

    if (newEndHour !== endHour) {
      onResize(session.id, startHour, newEndHour);
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={` ${getStatusColor()} cursor-move rounded-md text-xs text-black ${isDragging ? "opacity-50 shadow-lg" : ""} ${isResizing ? "resize-active" : ""} shadow-sm transition-all duration-200`}
      onClick={(e) => {
        e.stopPropagation();
        if (!isResizing) onClick(e);
      }}
      {...listeners}
      {...attributes}
    >
      <div className="p-2">
        <div className="truncate font-bold">{session.member.user.name}</div>
        <div className="text-xs opacity-75">
          {format(new Date(session.startTime), "HH:mm")} -{" "}
          {format(new Date(session.endTime), "HH:mm")}
        </div>
        {getStatusText() && (
          <div className="mt-1 text-xs font-bold text-white">
            {getStatusText()}
          </div>
        )}
      </div>

      {/* Resize handle */}
      {session.status === "NOT_YET" && (
        <div
          className={`absolute bottom-0 left-0 right-0 flex h-2 cursor-ns-resize items-center justify-center rounded-b hover:bg-[#86a439] ${isResizing ? "bg-[#86a439]" : ""} `}
          onMouseDown={handleResizeStart}
        >
          <div className="h-1 w-8 rounded-full bg-black/20" />
        </div>
      )}
    </div>
  );
}
