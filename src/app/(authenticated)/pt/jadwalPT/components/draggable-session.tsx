import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DraggableSessionProps {
  session: any;
  onClick: (e: React.MouseEvent) => void;
  onResize: (sessionId: string, startHour: number, endHour: number) => void;
  cellHeight: number;
}

export default function DraggableSession({ session, onClick, onResize, cellHeight }: DraggableSessionProps) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: session.id,
    data: {
      ...session,
      startHour: new Date(session.startTime).getHours(),
      endHour: new Date(session.endTime).getHours(),
    }
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  
  const startHour = new Date(session.startTime).getHours();
  const endHour = new Date(session.endTime).getHours();
  const duration = endHour - startHour;

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    height: `${duration * cellHeight}px`,
    position: 'absolute' as const,
    left: '4px',
    right: '4px',
    zIndex: isResizing || isDragging ? 50 : 1,
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartY(e.clientY);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeStartY;
    const hourChange = Math.round(deltaY / cellHeight);
    const newEndHour = Math.min(Math.max(startHour + 1, endHour + hourChange), 23);

    if (newEndHour !== endHour) {
      onResize(session.id, startHour, newEndHour);
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`
        bg-[#C9D953] text-black text-xs rounded-md
        cursor-move hover:bg-[#b8c748] 
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
        ${isResizing ? 'resize-active' : ''}
        transition-all duration-200
        shadow-sm
      `}
      onClick={(e) => {
        if (!isResizing) onClick(e);
      }}
      {...listeners}
      {...attributes}
    >
      <div className="p-2">
        <div className="font-bold truncate">{session.member.user.name}</div>
        <div className="text-xs opacity-75">
          {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
        </div>
      </div>
      
      {/* Resize handle */}
      <div 
        className={`
          absolute bottom-0 left-0 right-0 h-2
          cursor-ns-resize hover:bg-[#86a439]
          rounded-b flex items-center justify-center
          ${isResizing ? 'bg-[#86a439]' : ''}
        `}
        onMouseDown={handleResizeStart}
      >
        <div className="w-8 h-1 bg-black/20 rounded-full" />
      </div>
    </div>
  );
} 