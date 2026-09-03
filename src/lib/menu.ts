import {
  Users,
  UserCog,
  Package,
  UserPlus,
  Dumbbell,
  CreditCard,
  Contact,
  ContactRound,
  DollarSign,
  Gift,
  Calendar1,
  Clock,
  CircleGauge,
  BookOpen,
  HandCoins,
  Ticket,
  Settings,
  Store,
  ShoppingCart,
  Package2,
  Truck,
  ArrowLeftRight,
  ClipboardList,
  UserRound,
  FileText,
  Fingerprint,
  Badge,
  Mail,
  Building2,
  Mic,
  ArrowRightLeft,
  Snowflake,
  BarChart3,
  Boxes,
  Coins,
  UserX,
  ShieldCheck,
  Layers,
  History,
  ScrollText,
  Tags,
  Database,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export interface MenuLeaf {
  title: string;
  url: string;
  icon?: LucideIcon;
  requiredPermission?: string;
  /** Only show when member has an active subscription of one of these package types */
  showForPackageTypes?: string[];
  /** Hide when member has an active subscription of one of these package types */
  hideForPackageTypes?: string[];
}

export interface MenuParent {
  title: string;
  icon?: LucideIcon;
  items: MenuLeaf[];
}

export type MenuItem = MenuLeaf | MenuParent;

export interface MenuGroup {
  title: string;
  url: string;
  items: MenuItem[];
}

export function isMenuParent(item: MenuItem): item is MenuParent {
  return "items" in item;
}

/** Flatten nested menu into a list of leaves (used for route lookup + command palette). */
export function flattenMenuItems(items: MenuItem[]): MenuLeaf[] {
  return items.flatMap((item) => (isMenuParent(item) ? item.items : [item]));
}

export const Menu: { navMain: MenuGroup[] } = {
  navMain: [
    {
      title: "Administration",
      url: "/admin",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: CircleGauge,
          requiredPermission: "menu:dashboard-admin",
        },
        {
          title: "Payment Validation",
          url: "/admin/payment-validation",
          icon: CreditCard,
          requiredPermission: "menu:payment",
        },
        {
          title: "Member",
          url: "/admin/member",
          icon: UserPlus,
          requiredPermission: "menu:member",
        },
        {
          title: "Reward",
          url: "/admin/reward",
          icon: Gift,
          requiredPermission: "menu:reward",
        },
        {
          title: "Classes & Groups",
          icon: Dumbbell,
          items: [
            {
              title: "Jadwal Kelas",
              url: "/admin/class-calendar",
              icon: Calendar1,
              requiredPermission: "list:classes",
            },
            {
              title: "Class Registration",
              url: "/admin/class/register",
              icon: UserPlus,
              requiredPermission: "menu:member",
            },
            {
              title: "Class Attendance",
              url: "/admin/class-attendance",
              icon: UserCog,
              requiredPermission: "menu:class-attendance",
            },
            {
              title: "Class Visit",
              url: "/admin/class-visit",
              icon: Ticket,
              requiredPermission: "manage:class-visit",
            },
            {
              title: "Group Class",
              url: "/admin/group-class",
              icon: Users,
              requiredPermission: "menu:group-management",
            },
            {
              title: "Group Management",
              url: "/admin/group-management",
              icon: Users,
              requiredPermission: "menu:group-management",
            },
          ],
        },
        {
          title: "History",
          icon: History,
          items: [
            {
              title: "Subscription History",
              url: "/admin/subscription-history",
              icon: CreditCard,
              requiredPermission: "menu:transaction",
            },
            {
              title: "Transfer History",
              url: "/admin/transfer-history",
              icon: ArrowRightLeft,
              requiredPermission: "menu:transaction",
            },
            {
              title: "Freeze History",
              url: "/admin/freeze-history",
              icon: Snowflake,
              requiredPermission: "menu:transaction",
            },
            {
              title: "Check-in Logs",
              url: "/admin/checkin-logs",
              icon: UserCog,
              requiredPermission: "menu:member",
            },
          ],
        },
        {
          title: "Logs",
          icon: ScrollText,
          items: [
            {
              title: "System Logs",
              url: "/admin/logs",
              icon: FileText,
              requiredPermission: "list:logs",
            },
            {
              title: "API Mutation Logs",
              url: "/admin/system-logs",
              icon: FileText,
              requiredPermission: "list:logs",
            },
          ],
        },
      ],
    },
    {
      title: "Management",
      url: "/management",
      items: [
        {
          title: "Trainers & Classes",
          icon: Dumbbell,
          items: [
            {
              title: "PT Calendar",
              url: "/management/schedule",
              icon: Calendar1,
              requiredPermission: "menu:trainers",
            },
            {
              title: "Personal Trainer",
              url: "/management/personal-trainer",
              icon: Contact,
              requiredPermission: "menu:trainers",
            },
            {
              title: "Instructor",
              url: "/management/instructor",
              icon: Mic,
              requiredPermission: "list:instructor",
            },
            {
              title: "Class",
              url: "/management/class",
              icon: BookOpen,
              requiredPermission: "menu:manage-classes",
            },
            {
              title: "Class Types",
              url: "/management/class-type",
              icon: Layers,
              requiredPermission: "menu:manage-classes",
            },
          ],
        },
        {
          title: "Packages & Promo",
          icon: Tags,
          items: [
            {
              title: "Package",
              url: "/management/package",
              icon: Package,
              requiredPermission: "menu:packages",
            },
            {
              title: "Payment List",
              url: "/management/subscription",
              icon: CreditCard,
              requiredPermission: "menu:subscription",
            },
            {
              title: "Freeze Price",
              url: "/admin/freeze-price",
              icon: DollarSign,
              requiredPermission: "list:freeze-price",
            },
            {
              title: "Voucher",
              url: "/management/voucher",
              icon: Ticket,
              requiredPermission: "menu:voucher",
            },
            {
              title: "Promo Campaign",
              url: "/management/promo",
              icon: Gift,
              requiredPermission: "menu:voucher",
            },
            {
              title: "Rewards",
              url: "/management/reward",
              icon: Gift,
              requiredPermission: "menu:reward",
            },
          ],
        },
        {
          title: "Employees",
          icon: ContactRound,
          items: [
            {
              title: "Employee",
              url: "/management/employee",
              icon: ContactRound,
              requiredPermission: "menu:employees",
            },
            {
              title: "Fitness Consultant",
              url: "/management/fitness-consultant",
              icon: Badge,
              requiredPermission: "menu:manage-fc",
            },
            {
              title: "Fingerprint Device",
              url: "/management/device",
              icon: Fingerprint,
              requiredPermission: "menu:employees",
            },
            {
              title: "Attendance Management",
              url: "/management/attendance",
              icon: Clock,
              requiredPermission: "menu:employees",
            },
          ],
        },
        {
          title: "Access Control",
          icon: ShieldCheck,
          items: [
            {
              title: "Users",
              url: "/management/user",
              icon: Users,
              requiredPermission: "menu:user",
            },
            {
              title: "Role",
              url: "/management/role",
              icon: UserCog,
              requiredPermission: "menu:role",
            },
            {
              title: "Permission",
              url: "/management/permission",
              icon: UserCog,
              requiredPermission: "menu:permission",
            },
            {
              title: "Role Permission",
              url: "/management/role-permission",
              icon: UserCog,
              requiredPermission: "menu:role-permission",
            },
          ],
        },
        {
          title: "Corporate",
          url: "/management/corporate",
          icon: Building2,
          requiredPermission: "manage:corporate",
        },
        {
          title: "Settings",
          icon: Settings,
          items: [
            {
              title: "Configuration",
              url: "/management/config",
              icon: Settings,
              requiredPermission: "menu:config",
            },
            {
              title: "Email Settings",
              url: "/management/config/email",
              icon: Mail,
              requiredPermission: "menu:config",
            },
          ],
        },
      ],
    },
    {
      title: "Point of Sale",
      url: "#",
      items: [
        {
          title: "POS Terminal",
          url: "/pos",
          icon: Store,
          requiredPermission: "menu:pos-sale",
        },
        {
          title: "Master Data",
          icon: Database,
          items: [
            {
              title: "Categories",
              url: "/management/pos-category",
              icon: Package2,
              requiredPermission: "menu:pos-category",
            },
            {
              title: "Items",
              url: "/management/pos-item",
              icon: ShoppingCart,
              requiredPermission: "menu:pos-item",
            },
            {
              title: "Suppliers",
              url: "/suppliers",
              icon: Truck,
              requiredPermission: "menu:supplier",
            },
          ],
        },
        {
          title: "Inventory",
          icon: Warehouse,
          items: [
            {
              title: "Inventory and Stock",
              url: "/inventory/stock",
              icon: Package,
              requiredPermission: "menu:inventory",
            },
            {
              title: "Inventory Transactions",
              url: "/inventory/transactions",
              icon: ArrowLeftRight,
              requiredPermission: "menu:inventory",
            },
            {
              title: "Purchase Orders",
              url: "/purchase-orders",
              icon: ClipboardList,
              requiredPermission: "menu:purchase-order",
            },
          ],
        },
      ],
    },
    {
      title: "Finance",
      url: "/finance/dashboard",
      items: [
        {
          title: "Dashboard",
          icon: CircleGauge,
          url: "/finance",
          requiredPermission: "menu:dashboard-finance",
        },
        {
          title: "Balance Account",
          url: "/finance/balance-account",
          icon: CreditCard,
          requiredPermission: "menu:balances",
        },
        {
          title: "Chart Of Account",
          url: "/finance/chart-of-account",
          icon: HandCoins,
          requiredPermission: "menu:coa",
        },
        {
          title: "Transactions",
          url: "/management/transaction",
          icon: DollarSign,
          requiredPermission: "menu:transaction",
        },
        {
          title: "Payment History",
          url: "/finance/subscription-history",
          icon: CreditCard,
          requiredPermission: "menu:transaction",
        },
      ],
    },
    {
      title: "Reports",
      url: "/reports",
      items: [
        {
          title: "Member & Employee",
          icon: Users,
          items: [
            {
              title: "Member Attendance Report",
              url: "/reports/member-attendance",
              icon: UserCog,
              requiredPermission: "report:member-attendance",
            },
            {
              title: "Active Membership Report",
              url: "/reports/active-membership",
              icon: Users,
              requiredPermission: "report:active-membership",
            },
            {
              title: "Member Berhenti",
              url: "/reports/churned-members",
              icon: UserX,
              requiredPermission: "report:active-membership",
            },
            {
              title: "Member Profile Report",
              url: "/reports/member-profile",
              icon: UserRound,
              requiredPermission: "report:member-profile",
            },
            {
              title: "Riwayat Poin",
              url: "/reports/point-history",
              icon: Coins,
              requiredPermission: "list:point-history",
            },
            {
              title: "Employee Attendance Report",
              url: "/reports/attendance-management",
              icon: Clock,
              requiredPermission: "report:employees",
            },
          ],
        },
        {
          title: "Trainer & Class",
          icon: Dumbbell,
          items: [
            {
              title: "PT Remaining Sessions",
              url: "/reports/pt-remaining-sessions",
              icon: Clock,
              requiredPermission: "report:pt-remaining-sessions",
            },
            {
              title: "Personal Trainer Report",
              url: "/reports/personal-trainers",
              icon: Contact,
              requiredPermission: "report:pt",
            },
            {
              title: "Trainer Sessions",
              url: "/reports/trainer-sessions",
              icon: Clock,
              requiredPermission: "report:pt",
            },
            {
              title: "Group Class Report",
              url: "/reports/group-class",
              icon: Users,
              requiredPermission: "report:pt",
            },
            {
              title: "Instructor Report",
              url: "/reports/instructor",
              icon: Mic,
              requiredPermission: "report:instructor",
            },
            {
              title: "Class Member Report",
              url: "/reports/class-member-report",
              icon: BarChart3,
              requiredPermission: "report:class-member-report",
            },
            {
              title: "Class Session Report",
              url: "/reports/class-session-report",
              icon: BookOpen,
              requiredPermission: "report:class-session",
            },
          ],
        },
        {
          title: "Finance",
          icon: HandCoins,
          items: [
            {
              title: "Commission Report",
              url: "/reports/commission-report",
              icon: DollarSign,
              requiredPermission: "report:commission",
            },
            {
              title: "Voucher Usage Report",
              url: "/reports/voucher-usage",
              icon: Gift,
              requiredPermission: "report:voucher",
            },
            {
              title: "Cash Bank Report",
              url: "/finance/cash-bank-report",
              icon: HandCoins,
              requiredPermission: "report:cash-bank",
            },
          ],
        },
        {
          title: "Inventory",
          icon: Boxes,
          items: [
            {
              title: "Inventory Report",
              url: "/reports/inventory",
              icon: Boxes,
              requiredPermission: "report:inventory",
            },
            {
              title: "Stock Movement Report",
              url: "/reports/stock-movement",
              icon: ArrowLeftRight,
              requiredPermission: "report:stock-movement",
            },
            {
              title: "Purchase Order Report",
              url: "/reports/purchase-orders",
              icon: ClipboardList,
              requiredPermission: "report:purchase-order",
            },
          ],
        },
      ],
    },
    {
      title: "Membership",
      url: "/member/dashboard",
      items: [
        {
          title: "Dashboard",
          icon: CircleGauge,
          url: "/member",
          requiredPermission: "menu:dashboard-member",
        },
        {
          title: "Classes",
          url: "/member/classes",
          icon: Dumbbell,
          requiredPermission: "menu:classes",
          showForPackageTypes: ["GYM_MEMBERSHIP", "CLASS_SESSION"],
        },
        {
          title: "Schedule",
          icon: Calendar1,
          url: "/member/calendar-session",
          requiredPermission: "menu:session",
        },
        {
          title: "Training History",
          icon: Clock,
          url: "/member/training-history",
          requiredPermission: "menu:dashboard-member",
        },
        {
          title: "Payment History",
          icon: CreditCard,
          url: "/member/payment-history",
          requiredPermission: "menu:payment-history",
        },
        {
          title: "Request Class",
          icon: Ticket,
          url: "/member/class-visit",
          requiredPermission: "request:class-visit",
          hideForPackageTypes: ["GYM_MEMBERSHIP"],
        },
        {
          title: "My Groups",
          icon: Users,
          url: "/member/groups",
          requiredPermission: "menu:groups",
        },
        {
          title: "Profile",
          icon: UserRound,
          url: "/member/profile",
          requiredPermission: "member:profile",
        },
        {
          title: "Body Tracking",
          icon: CircleGauge,
          url: "/member/body-composition",
          requiredPermission: "menu:payment-history",
        },
        {
          title: "Riwayat Poin",
          icon: Coins,
          url: "/member/point-history",
          requiredPermission: "show:profile",
        },
      ],
    },
    {
      title: "Fitness Consultant",
      url: "/fc/dashboard",
      items: [
        {
          title: "Dashboard",
          icon: CircleGauge,
          url: "/fitness-consultants",
          requiredPermission: "menu:dashboard-fc",
        },
        {
          title: "Member Management",
          icon: Users,
          url: "/fitness-consultants/members",
          requiredPermission: "menu:fc-member",
        },
      ],
    },
    {
      title: "Personal Trainer",
      url: "/instructor/dashboard",
      items: [
        {
          title: "Dashboard",
          icon: CircleGauge,
          url: "/personal-trainers",
          requiredPermission: "menu:dashboard-pt",
        },
        {
          title: "Profile",
          icon: UserRound,
          url: "/personal-trainers/profile",
          requiredPermission: "menu:profile-pt",
        },
        {
          title: "Schedule",
          icon: Calendar1,
          url: "/personal-trainers/schedule",
          requiredPermission: "menu:schedule-pt",
        },
        {
          title: "Member List",
          icon: Users,
          url: "/personal-trainers/member-list",
          requiredPermission: "menu:member-list-pt",
        },
      ],
    },
  ],
};
