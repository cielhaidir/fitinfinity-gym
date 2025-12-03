import Calendar from "@/app/(authenticated)/personal-trainers/schedule/components/calendar";
import {
  Users,
  UserCog,
  Package,
  User,
  UserPlus,
  Dumbbell,
  CreditCard,
  Contact,
  ContactRound,
  DollarSign,
  Gift,
  CircleGauge,
  UserRound,
  Calendar1,
  Badge,
  Book,
  Settings,
  Mail,
  ShoppingCart,
  Package2,
  Store,
  Clock,
  BarChart3,
  FileText,
  Truck,
  Boxes,
  ArrowLeftRight,
  ClipboardList,
} from "lucide-react";
import { type LucideIcon, HandCoins } from "lucide-react";

interface MenuItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  requiredPermission?: string;
}

interface MenuGroup {
  title: string;
  url: string;
  items: MenuItem[];
}

export const Menu: { navMain: MenuGroup[] } = {
  navMain: [
    {
      title: "Management",
      url: "#",
      items: [
        {
          title: "PT Calendar",
          url: "/management/schedule",
          icon: Calendar1,
          requiredPermission: "menu:trainers", // Atur permission sesuai kebutuhan
        },
        {
          title: "Personal Trainer",
          url: "/management/personal-trainer",
          icon: Contact,
          requiredPermission: "menu:trainers",
        },
        {
          title: "Package",
          url: "/management/package",
          icon: Package,
          requiredPermission: "menu:packages",
        },
        {
          title: "Class",
          url: "/management/class",
          icon: Dumbbell,
          requiredPermission: "menu:manage-classes",
        },
        {
          title: "Class Types",
          url: "/management/class-type",
          icon: Settings,
          requiredPermission: "menu:manage-classes",
        },
        {
          title: "Employee",
          url: "/management/employee",
          icon: ContactRound,
          requiredPermission: "menu:employees",
        },
        {
          title: "Fingerprint Device",
          url: "/management/device",
          icon: ContactRound,
          requiredPermission: "menu:employees",
        },
        {
          title: "Attendance Management",
          url: "/management/attendance",
          icon: Clock,
          requiredPermission: "menu:employees",
        },
        {
          title: "Users",
          url: "/management/user",
          icon: Dumbbell,
          requiredPermission: "menu:user",
        },
        {
          title: "Voucher",
          url: "/management/voucher",
          icon: Users,
          requiredPermission: "menu:voucher",
        },
        {
          title: "Role Permission",
          url: "/management/role-permission",
          icon: Users,
          requiredPermission: "menu:role-permission",
        },
        {
          title: "Permission",
          url: "/management/permission",
          icon: Book,
          requiredPermission: "menu:permission",
        },
        {
          title: "Role",
          url: "/management/role",
          icon: Users,
          requiredPermission: "menu:role",
        },
        // {
        //     title: "Member",
        //     url: "/management/member",
        //     icon: UserCog,
        //     // requiredPermission: "list:roles"
        // },
        {
          title: "Fitness Consultant",
          url: "/management/fitness-consultant",
          icon: Badge,
          requiredPermission: "menu:manage-fc",
        },
        {
          title: "Payment List",
          url: "/management/subscription",
          icon: CreditCard,
          requiredPermission: "menu:subscription",
        },
        // {
        //   title: "Import Subscriptions",
        //   url: "/management/subscription/import",
        //   icon: Package,
        //   requiredPermission: "create:subscription",
        // },
        {
          title: "Rewards",
          url: "/management/reward",
          icon: Gift,
          requiredPermission: "menu:reward",
        },
        // {
        //     title: "Configuration",
        //     url: "/management/config",
        //     icon: Settings,
        //     // requiredPermission: "manage:config"
        // },
        {
          title: "Email Settings",
          url: "/management/config/email",
          icon: Mail,
          requiredPermission: "menu:config"
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
    {
      title: "Administration",
      url: "/admin",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: CircleGauge,
          requiredPermission: "menu:dashboard-admin", // Permission doesn't exist
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
          title: "Class Registration",
          url: "/admin/class/register",
          icon: UserPlus,
          requiredPermission: "menu:member",
        },
        {
          title: "Check-in Logs",
          url: "/admin/checkin-logs",
          icon: UserCog,
          requiredPermission: "menu:member",
        },
        {
          title: "Class Attendance",
          url: "/admin/class-attendance",
          icon: UserCog,
          requiredPermission: "menu:class-attendance",
        },
        {
          title: "Package Management",
          url: "/admin/package-management",
          icon: Package,
          requiredPermission: "menu:package-management",
        },
        {
          title: "Group Management",
          url: "/admin/group-management",
          icon: Users,
          requiredPermission: "menu:group-management",
        },
        {
          title: "Personal Trainer Management",
          url: "/admin/personal-trainer-management",
          icon: Contact,
          requiredPermission: "menu:personal-trainer-management",
        },
        {
          title: "Reward",
          url: "/admin/reward",
          icon: Gift,
          requiredPermission: "menu:reward",
        },
        {
          title: "Subscription History",
          url: "/admin/subscription-history",
          icon: CreditCard,
          requiredPermission: "menu:transaction",
        },
        {
          title: "System Logs",
          url: "/admin/logs",
          icon: FileText,
          requiredPermission: "list:logs",
        },

        // {
        //     title: "Settings",
        //     url: "/admin/settings",
        // },
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
        },
        {
          title: "Schedule",
          icon: Calendar1,
          url: "/member/calendar-session",
          requiredPermission: "menu:session",
        },
        // {
        //     title: "Vouchers",
        //     url: "/member/vouchers",
        // },
        // {
        //     title: "Point",
        //     url: "/member/point-reward",
        // },
        // {
        //     title: "Online Payment History",
        //     icon:CreditCard,
        //     url: "/management/subscription",
        // },
        {
          title: "Payment History",
          icon: CreditCard,
          url: "/member/payment-history",
          requiredPermission: "menu:payment-history",
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
        // {
        //   title: "Personal Trainer List",
        //   icon: Contact,
        //   url: "/member/personal-trainer",
        // },
        // {
        //     title: "Settings",
        //     url: "/member/settings",
        // },
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
        // {
        //     title: "Classes",
        //     url: "/personal-trainers/classes",
        // },
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
    {
      title: "Finance",
      url: "/finance/dashboard",
      items: [
        {
          title: "Dashboard",
          icon: CircleGauge,
          url: "/finance",
          requiredPermission: "menu:dashboard-finance", // Permission doesn't exist
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
          title: "Member Attendance Report",
          url: "/reports/member-attendance",
          icon: UserCog,
          requiredPermission: "report:member-attendance",
        },
        {
          title: "Employee Attendance Report",
          url: "/reports/attendance-management",
          icon: Clock,
          requiredPermission: "report:employees",
        },
        {
          title: "Class Member Report",
          url: "/reports/class-member-report",
          icon: BarChart3,
          requiredPermission: "report:class-member-report",
        },
        {
          title: "Personal Trainer Report",
          url: "/reports/personal-trainers",
          icon: Contact,
          requiredPermission: "report:pt",
        },
        {
          title: "Sales Report",
          url: "/reports/sales-report",
          icon: DollarSign,
          requiredPermission: "report:sales",
        },
        {
          title: "Commission Report",
          url: "/reports/commission-report",
          icon: DollarSign,
          requiredPermission: "report:commission",
        },
        {
          title: "Cash Bank Report",
          url: "/finance/cash-bank-report",
          icon: HandCoins,
          requiredPermission: "report:cash-bank",
        },
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
};
