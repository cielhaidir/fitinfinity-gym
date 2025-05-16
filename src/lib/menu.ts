import { Users, UserCog, Package, User, UserPlus, Dumbbell, CreditCard, Contact, ContactRound, DollarSign } from 'lucide-react';
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
                    url: '/admin/reward',
                    icon: CreditCard,
                    requiredPermission: "list:reward"
                }
            ],
        },
        // {
        //     title: "Administration",
        //     url: "/admin/dashboard",
        //     items: [
        //         {
        //             title: "Dashboard",
        //             url: "/admin/dashboard",
        //             requiredPermission: "read:dashboard-admin"
        //         },
        //         {
        //             title: "Settings",
        //             url: "/admin/settings",
        //         },
        //     ],
        // },
        {
            title: "Membership",
            url: "/member/dashboard",
            items: [
                {
                    title: "Dashboard",
                    url: "/member",
                },
                {
                    title: "Classes",
                    url: "/member/classes",
                    requiredPermission: "list:classes"
                },
                {
                    title: "Schedule",
                    url: "/member/schedule",
                    requiredPermission: "list:session"
                },
                // {
                //     title: "Avalaible Package",
                //     url: "/member/package",
                // },
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
                    url: "/member/payment",
                },
                {
                    title: "Profile",
                    url: "/member/profile",
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
                    url: "/instructor/dashboard",
                },
                {
                    title: "Profile",
                    url: "/instructor/profile",
                },
                {
                    title: "Classes",
                    url: "/instructor/classes",
                },
                {
                    title: "Schedule",
                    url: "/instructor/jadwalPT",
                },
                // {
                //     title: "Payment",
                //     url: "/instructor/payment",
                // },
            ],
        },
        {
            title: "Finance",
            url: "/finance/dashboard",
            items: [
                {
                    title: "Dashboard",
                    url: "/finance/dashboard",
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
                {
                    title: "Report",
                    url: "/finance/report",
                },
            ],
        },
     
    ],
};