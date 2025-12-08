"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface Member {
  id: string;
  rfidNumber: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface RFIDContextType {
  isCheckInModalOpen: boolean;
  selectedMemberForCheckIn: Member | null;
  openCheckInModal: (member: Member) => void;
  closeCheckInModal: () => void;
}

const RFIDContext = createContext<RFIDContextType | undefined>(undefined);

export function useRFIDCheckIn() {
  const context = useContext(RFIDContext);
  if (context === undefined) {
    throw new Error("useRFIDCheckIn must be used within a RFIDProvider");
  }
  return context;
}

interface RFIDProviderProps {
  children: ReactNode;
}

export function RFIDProvider({ children }: RFIDProviderProps) {
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedMemberForCheckIn, setSelectedMemberForCheckIn] = useState<Member | null>(null);
  
  // RFID scanner state
  const [rfidBuffer, setRfidBuffer] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const rfidTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use dedicated RFID lookup hook (only called when needed)
  const [currentRFID, setCurrentRFID] = useState<string | null>(null);
  const [currentMembershipId, setCurrentMembershipId] = useState<string | null>(null);
  
  const { data: foundMemberByRFID, isLoading: isSearchingRFID } = api.member.findByRFID.useQuery(
    { rfidNumber: currentRFID! },
    {
      enabled: !!currentRFID,
      retry: false,
    }
  );

  const { data: foundMemberByMembershipId, isLoading: isSearchingMembershipId } =
    api.member.findByMembershipId.useQuery(
      { membershipId: currentMembershipId! },
      {
        enabled: !!currentMembershipId,
        retry: false,
      }
    );

  const findMemberByRFID = useCallback((rfidNumber: string) => {
    console.log("Searching for RFID:", rfidNumber);
    setCurrentRFID(rfidNumber);
  }, []);

  const findMemberByMembershipId = useCallback((membershipId: string) => {
    // Convert to lowercase to handle CapsLock/uppercase input from scanners
    const normalizedId = membershipId.toLowerCase();
    console.log("Searching for membership ID:", normalizedId);
    setCurrentMembershipId(normalizedId);
  }, []);

  // Handle the RFID API response
  useEffect(() => {
    if (currentRFID && !isSearchingRFID) {
      if (foundMemberByRFID) {
        console.log("Member found by RFID, opening modal:", foundMemberByRFID);
        setSelectedMemberForCheckIn(foundMemberByRFID);
        setIsCheckInModalOpen(true);
        toast.success(`Member found: ${foundMemberByRFID.user.name}`);
      } else {
        console.log("Member not found for RFID:", currentRFID);
        toast.error(`Member with RFID ${currentRFID} not found`);
      }
      // Reset the search
      setCurrentRFID(null);
    }
  }, [currentRFID, foundMemberByRFID, isSearchingRFID]);

  // Handle the membership ID API response
  useEffect(() => {
    if (currentMembershipId && !isSearchingMembershipId) {
      if (foundMemberByMembershipId) {
        console.log("Member found by membership ID, opening modal:", foundMemberByMembershipId);
        setSelectedMemberForCheckIn(foundMemberByMembershipId);
        setIsCheckInModalOpen(true);
        toast.success(`Member found: ${foundMemberByMembershipId.user.name}`);
      } else {
        console.log("Member not found for membership ID:", currentMembershipId);
        toast.error(`Member with ID ${currentMembershipId} not found`);
      }
      // Reset the search
      setCurrentMembershipId(null);
    }
  }, [currentMembershipId, foundMemberByMembershipId, isSearchingMembershipId]);

  const handleRFIDScan = useCallback((rfidNumber: string) => {
    console.log("Processing RFID scan:", rfidNumber);
    findMemberByRFID(rfidNumber);
  }, [findMemberByRFID]);

  const processRFIDBuffer = useCallback(() => {
    const trimmedBuffer = rfidBuffer.trim();
    console.log("Processing buffer:", trimmedBuffer, "Length:", trimmedBuffer.length);
    
    // Check if buffer contains exactly 10 digits (RFID format)
    const isRFID = /^\d{10}$/.test(trimmedBuffer);
    // Check if buffer contains alphanumeric string longer than 10 chars (membership ID format)
    const isMembershipId = /^[a-z0-9]{20,}$/i.test(trimmedBuffer);
    
    if (isRFID) {
      console.log("Valid RFID detected:", trimmedBuffer);
      handleRFIDScan(trimmedBuffer);
    } else if (isMembershipId) {
      console.log("Valid membership ID detected:", trimmedBuffer);
      findMemberByMembershipId(trimmedBuffer);
    } else {
      console.log("Invalid scan format:", trimmedBuffer);
    }
    
    // Clear buffer after processing
    setRfidBuffer("");
  }, [rfidBuffer, handleRFIDScan, findMemberByMembershipId]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const now = Date.now();
    
    // If too much time has passed since last keystroke, reset buffer
    if (now - lastScanTime > 100) {
      setRfidBuffer("");
    }
    
    setLastScanTime(now);
    
    // Clear existing timeout
    if (rfidTimeoutRef.current) {
      clearTimeout(rfidTimeoutRef.current);
    }
    
    if (event.key === "Enter") {
      console.log("Enter pressed, buffer:", rfidBuffer);
      // Process the buffer when Enter is pressed
      processRFIDBuffer();
    } else if (/^[a-zA-Z0-9]$/.test(event.key)) {
      // Add alphanumeric character to buffer (supports both RFID and membership ID)
      setRfidBuffer(prev => {
        const newBuffer = prev + event.key;
        console.log("Adding character:", event.key, "New buffer:", newBuffer);
        // Limit buffer to reasonable length to prevent overflow
        return newBuffer.length > 50 ? newBuffer.slice(-50) : newBuffer;
      });
      
      // Set timeout to clear buffer if no Enter is received
      rfidTimeoutRef.current = setTimeout(() => {
        console.log("Buffer timeout, clearing");
        setRfidBuffer("");
      }, 1000);
    }
  }, [lastScanTime, processRFIDBuffer, rfidBuffer]);

  // Add global keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  const openCheckInModal = useCallback((member: Member) => {
    setSelectedMemberForCheckIn(member);
    setIsCheckInModalOpen(true);
  }, []);

  const closeCheckInModal = useCallback(() => {
    setIsCheckInModalOpen(false);
    setSelectedMemberForCheckIn(null);
  }, []);

  const value = {
    isCheckInModalOpen,
    selectedMemberForCheckIn,
    openCheckInModal,
    closeCheckInModal,
  };

  return (
    <RFIDContext.Provider value={value}>
      {children}
    </RFIDContext.Provider>
  );
}