"use client"

import {
  Gift,
  Award,
  Badge,
  Crown,
  Star,
  Heart,
  Trophy,
  Gem,
  Ticket,
  Zap,
  Coffee,
  Shirt,
  Smartphone,
  Headphones,
  Book,
  type LucideIcon,
  type LightbulbIcon as LucideProps,
} from "lucide-react"

interface DynamicIconProps extends React.ComponentProps<LucideIcon> {
  name: string
}

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const iconMap: Record<string, LucideIcon> = {
    Gift,
    Award,
    Badge,
    Crown,
    Star,
    Heart,
    Trophy,
    Gem,
    Ticket,
    Zap,
    Coffee,
    Shirt,
    Smartphone,
    Headphones,
    Book,
  }

  const IconComponent = iconMap[name] || Gift

  return <IconComponent {...props} />
}

