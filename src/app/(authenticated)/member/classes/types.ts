export interface Class {
  id?: string;
  name: string;
  limit: number | null;
  instructorName: string;
  schedule: Date;
  duration: number;
  price: number;
  registeredMembers?: ClassMember[];
  waitingList?: ClassWaitingList[];
  createdAt: Date;
  updatedAt: Date;
}

interface ClassMember {
  id: string;
  memberId: string;
  member: {
    user: {
      name: string | null;
    };
  };
}

interface ClassWaitingList {
  id: string;
  memberId: string;
  member: {
    user: {
      name: string | null;
    };
  };
}
