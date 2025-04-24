export interface Class {
    id?: string
    name: string
    limit: number | null
    trainerId: string
    schedule: Date
    duration: number
    price: number
    trainer: {
        id: string
        userId: string
        description: string | null
        user: {
            name: string | null
        }
    }
    registeredMembers?: ClassMember[]
    waitingList?: ClassWaitingList[]
    createdAt: Date
    updatedAt: Date
}

interface ClassMember {
    id: string
    memberId: string
    member: {
        user: {
            name: string | null
        }
    }
}

interface ClassWaitingList {
    id: string
    memberId: string
    member: {
        user: {
            name: string | null
        }
    }
} 