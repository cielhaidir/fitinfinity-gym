import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

type ShortcutBadgeProps = {
    keyChar: string
}

export function ShortcutBadge({ keyChar }: ShortcutBadgeProps) {
    const [modifier, setModifier] = useState("")

    useEffect(() => {
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
        setModifier(isMac ? "⌘" : "Ctrl")
    }, [])

    return <Badge variant="secondary">{modifier} + {keyChar}</Badge>
}
