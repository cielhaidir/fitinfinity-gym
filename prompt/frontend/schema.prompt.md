file: prisma/schema.prisma

## CODE NOTE

    - Model is from schema prisma
    - the object is from the model defined in schema prisma
    - You will defined schema with zodd

## Example For Schema

```typescript
// THis is from model user and member
export const UserMemberSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    email: z.string().email(),
    user: z.object({
        name: z.string().nullable(),
        email: z.string().nullable().transform(e => e === "" ? null : e),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        birthDate: z.date().nullable(),
        idNumber: z.string().nullable(),
    }).optional(),
    address: z.string(),
    phone: z.string(),
    birthDate: z.date(),
    idNumber: z.string(),
    rfidNumber: z.string().nullable(),
})

export type UserMember = z.infer<typeof UserMemberSchema>
```