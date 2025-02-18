  "use client"

  import type React from "react"
  import { api } from "@/trpc/react"
  import { DataTable } from "@/components/datatable/data-table"
  import { columns } from "./columns"
  import { useState } from "react"
  import { Plus, Scan } from "lucide-react"
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
  } from "@/components/ui/sheet"

  export default function MemberPage() {
    const utils = api.useUtils()
    const { data: member = { memberships: [], total: 0, page: 1, limit: 10 } } = api.member.list.useQuery({
      page: 1,
      limit: 10,
    })

    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [newMember, setNewMember] = useState({
      registerDate: new Date().toISOString().split("T")[0],
      rfidNumber: "",
      isActive: true,
      name: "",
      email: "",
      file: "",
      address: "",
      phone: "",
      birthDate: "",
      idNumber: "",
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target
      setNewMember((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }))
    }

    const handleScanRFID = () => {
      // Implement RFID scanning logic here
      console.log("Scanning RFID...")
    }

    const handleCreateMember = () => {
      // Implement member creation logic here

      // const user =  api.user.create
      // const membership = api.membership.create{userId: user.id, registerDate: newMember.registerDate, rfidNumber: newMember.rfidNumber, isActive: newMember.isActive, createdBy: user.id, revokedAt: null}
      
      console.log("Creating new member:", newMember)
      setIsSheetOpen(false)
    }

    const handlePaginationChange = (page: number, limit: number) => {
      utils.member.list.invalidate({ page, limit })
    }

    return (
      <>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Membership Management</h2>
                <p className="text-muted-foreground">Here&apos;s a list of Fit Infinity Member!</p>
              </div>
              <SheetTrigger asChild>
                <Button className="mb-4 bg-infinity">
                  <Plus className="mr-2 h-4 w-4" /> Create Member
                </Button>
              </SheetTrigger>
            </div>

            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Create New Member</SheetTitle>
                <SheetDescription>Add a new member to the system.</SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium ">
                    Name
                  </label>
                  <Input id="name" name="name" placeholder="Name" value={newMember.name} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium ">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    placeholder="Email"
                    value={newMember.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="file" className="block text-sm font-medium ">
                    File
                  </label>
                  <Input id="file" name="file" placeholder="File" value={newMember.file} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium ">
                    Address
                  </label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Address"
                    value={newMember.address}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium ">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="Phone"
                    value={newMember.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium ">
                    Birth Date
                  </label>
                  <Input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    value={newMember.birthDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="idNumber" className="block text-sm font-medium ">
                    ID Number
                  </label>
                  <Input
                    id="idNumber"
                    name="idNumber"
                    placeholder="ID Number"
                    value={newMember.idNumber}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="registerDate" className="block text-sm font-medium ">
                    Register Date
                  </label>
                  <Input
                    id="registerDate"
                    name="registerDate"
                    type="date"
                    value={newMember.registerDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="rfidNumber" className="block text-sm font-medium ">
                    RFID Number
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      id="rfidNumber"
                      name="rfidNumber"
                      placeholder="RFID Number"
                      value={newMember.rfidNumber}
                      onChange={handleInputChange}
                    />
                    <Button onClick={handleScanRFID} className="bg-infinity whitespace-nowrap">
                      <Scan className="mr-2 h-4 w-4" /> Scan RFID
                    </Button>
                  </div>
                </div>
              </div>
              <SheetFooter className="flex justify-end gap-2">
                <Button onClick={handleCreateMember} className="bg-infinity">Create Member</Button>
                <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
              </SheetFooter>
            </SheetContent>

            <DataTable data={member} columns={columns} onPaginationChange={handlePaginationChange} />
          </div>
        </Sheet>
      </>
    )
  }

