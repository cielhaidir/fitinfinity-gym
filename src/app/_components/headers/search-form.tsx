import { Search } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";

import { ShortcutBadge } from "../ShorcutBadge";
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
            className="w-full text-muted-foreground"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Search className="" />
            Search menu...
            <ShortcutBadge keyChar="K" />
          </Button>
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}

