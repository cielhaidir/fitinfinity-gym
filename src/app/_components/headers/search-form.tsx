import { Search } from "lucide-react"

import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";

type SearchFormProps = {
  setOpen: (open: boolean) => void
}
export function SearchForm({ setOpen, ...props }: SearchFormProps & React.ComponentProps<"form">) {
  return (
    <form {...props}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">

            <Button
            variant="outline"
            className="w-full text-muted-foreground pl-0"
            onClick={() => setOpen(true)}
            type="button" 
          >
            <Search className="" />
            Search menu...
          </Button>
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}

