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
          title: "Personal Trainer",
          url: "/management/personal-trainer",
          icon: Contact,
          requiredPermission: "list:trainers",
        },
        {
          title: "Package",
          url: "/management/package",
          icon: Package,
          requiredPermission: "list:packages",
        },
        {
          title: "Member",
          url: "/management/member",
          icon: UserPlus,
          requiredPermission: "list:members",
        },
        {
          title: "Class",
          url: "/management/class",
          icon: Dumbbell,
          requiredPermission: "list:classes",
        },
        {
          title: "Employee",
          url: "/management/employee",
          icon: ContactRound,
          requiredPermission: "list:employees",
        },
        {
          title: "Users",
          url: "/management/user",
          icon: Dumbbell,
          requiredPermission: "list:users",
        },
        {
          title: "Voucher",
          url: "/management/voucher",
          icon: Users,
          requiredPermission: "list:vouchers",
        },
        {
          title: "Role Permission",
          url: "/management/role-permission",
          icon: Users,
          requiredPermission: "list:roles",
        },
        {
          title: "Permission",
          url: "/management/permission",
          icon: Book,
          requiredPermission: "list:roles",
        },
        {
          title: "Role",
          url: "/management/role",
          icon: Users,
          requiredPermission: "list:roles",
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
          requiredPermission: "list:fc",
        },
        {
          title: "Payment List",
          url: "/management/subscription",
          icon: CreditCard,
          requiredPermission: "list:subscriptions",
        },
        {
          title: "Rewards",
          url: "/management/reward",
          icon: Gift,
          requiredPermission: "list:reward",
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
          // requiredPermission: "manage:config"
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
          requiredPermission: "list:dashboard-admin",
        },
        {
          title: "Payment Validation",
          url: "/admin/payment-validation",
          icon: CreditCard,
          requiredPermission: "list:payment-validation",
        },
        {
          title: "Reward",
          url: "/admin/reward",
          icon: Gift,
          requiredPermission: "list:admin-reward",
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
        },
        {
          title: "Classes",
          url: "/member/classes",
          icon: Dumbbell,
          requiredPermission: "list:classes",
        },
        {
          title: "Schedule",
          icon: Calendar1,
          url: "/member/calendar-session",
          requiredPermission: "list:session",
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
        },
        {
          title: "Profile",
          icon: UserRound,
          url: "/member/profile",
        },
        {
          title: "Personal Trainer List",
          icon: Contact,
          url: "/member/personal-trainer",
        },
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
          requiredPermission: "list:dashboard-fc",
        },
        {
          title: "Member Management",
          icon: Users,
          url: "/fitness-consultants/members",
          requiredPermission: "list:members-fc",
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
          url: "/PT",
          requiredPermission: "list:dashboard-pt",
        },
        {
          title: "Profile",
          icon: UserRound,
          url: "/PT/profile",
          requiredPermission: "list:profile-pt",
        },
        // {
        //     title: "Classes",
        //     url: "/PT/classes",
        // },
        {
          title: "Schedule",
          icon: Calendar1,
          url: "/PT/jadwalPT",
          requiredPermission: "list:schedule-pt",
        },
        {
          title: "Member List",
          icon: Users,
          url: "/PT/member_list",
          requiredPermission: "list:member-pt",
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
          requiredPermission: "list:dashboard-finance",
        },
        {
          title: "Balance Account",
          url: "/finance/balance-account",
          icon: CreditCard,
          requiredPermission: "list:balance-account",
        },
        {
          title: "Chart Of Account",
          url: "/finance/chart-of-account",
          icon: HandCoins,
          requiredPermission: "list:chart-of-account",
        },
        {
          title: "Transactions",
          url: "/management/transaction",
          icon: DollarSign,
          requiredPermission: "list:transactions",
        },
        // {
        //     title: "Report",
        //     url: "/finance/report",
        // },
      ],
    },
  ],
};
