import Calendar from '@/app/(authenticated)/PT/jadwalPT/components/calendar';
import { Users, UserCog, Package, User, UserPlus, Dumbbell, CreditCard, Contact, ContactRound, DollarSign, Gift, CircleGauge, UserRound, Calendar1 } from 'lucide-react';
import { LucideIcon, HandCoins } from 'lucide-react';

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
                    requiredPermission: "list:trainers"
                },
                {
                    title: "Package",
                    url: "/management/package",
                    icon: Package,
                    requiredPermission: "list:packages"
                },
                {
                    title: "Member",
                    url: "/management/member",
                    icon: UserPlus,
                    requiredPermission: "list:members"
                },
                {
                    title: "Class",
                    url: "/management/class",
                    icon: Dumbbell,
                    requiredPermission: "list:classes"
                },
                {
                    title: "Employee",
                    url: "/management/employee",
                    icon: ContactRound,
                    requiredPermission: "list:employees"
                },
                {
                    title: "Users",
                    url: "/management/user",
                    icon: Dumbbell,
                    //requiredPermission: "list:users"
                },
                {
                    title: "Voucher",
                    url: "/management/voucher",
                    icon: Users,
                    requiredPermission: "list:vouchers"
                },
                {
                    title: "Role Permission",
                    url: "/management/role-permission",
                    icon: Users,
                    // requiredPermission: "list:roles"
                },
                {
                    title: "Permission",
                    url: "/management/permission",
                    icon: Users,
                    // requiredPermission: "list:roles"
                },
                {
                    title: "Role",
                    url: "/management/role",
                    icon: Users,
                    // requiredPermission: "list:roles"
                },
                // {
                //     title: "Users",
                //     url: "/management/user",
                //     icon: UserCog,
                //     // requiredPermission: "list:roles"
                // },
                {
                    title: 'Subscription',
                    url: '/management/subscription',
                    icon: CreditCard,
                    requiredPermission: "list:subscriptions"
                },
                {
                    title: 'Rewards',
                    url: '/management/reward',
                    icon: Gift,
                    requiredPermission: "list:reward"
                }
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
                    requiredPermission: "list:dashboard-admin"
                },
                {
                    title: "Payment Validation",
                    url: "/admin/payment-validation",
                    icon: CreditCard,
                    requiredPermission: "list:payment-validation"
                },
                {
                    title: "Reward",
                    url: "/admin/reward",
                    icon: Gift,
                    requiredPermission: "list:admin-reward"
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
                    requiredPermission: "list:classes"
                },
                {
                    title: "Schedule",
                    icon: Calendar1,
                    url: "/member/calendar-session",
                    requiredPermission: "list:session"
                },
                // {
                //     title: "Vouchers",
                //     url: "/member/vouchers",
                // },
                // {
                //     title: "Point",
                //     url: "/member/point-reward",
                // },
                {
                    title: "Payment History",
                    icon:CreditCard,
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
            title: "Personal Trainer",
            url: "/instructor/dashboard",
            items: [
                {
                    title: "Dashboard",
                    icon: CircleGauge,
                    url: "/PT",
                },
                {
                    title: "Profile",
                    icon: UserRound,
                    url: "/PT/profile",
                },
                // {
                //     title: "Classes",
                //     url: "/PT/classes",
                // },
                {
                    title: "Schedule",
                    icon: Calendar1,
                    url: "/PT/jadwalPT",
                },
                {
                    title: "Member List",
                    icon: Users,
                    url: "/PT/member_list",
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
                },
                {
                    title: "Balance Account",
                    url: "/finance/balance-account",
                    icon: CreditCard,
                },
                {
                    title: "Chart Of Account",
                    url: "/finance/chart-of-account",
                    icon: HandCoins,
                },
                {
                    title: "Transactions",
                    url: "/management/transaction",
                    icon: DollarSign,
                    // requiredPermission: "manage:transactions"
                },
                // {
                //     title: "Report",
                //     url: "/finance/report",
                // },
            ],
        },
     
    ],
};