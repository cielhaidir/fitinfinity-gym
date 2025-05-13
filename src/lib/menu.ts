import { Users, UserCog, Package, User, UserPlus, Dumbbell, CreditCard, Contact, ContactRound } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

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
                    requiredPermission: "list:users"
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
                {
                    title: 'Subscription',
                    url: '/management/subscription',
                    icon: CreditCard,
                    requiredPermission: "list:subscriptions"
                }
            ],
        },
        {
            title: "Administration",
            url: "/admin/dashboard",
            items: [
                {
                    title: "Dashboard",
                    url: "/admin/dashboard",
                    requiredPermission: "read:dashboard-admin"
                },
                {
                    title: "Settings",
                    url: "/admin/settings",
                },
            ],
        },
        {
            title: "Membership",
            url: "/member/dashboard",
            items: [
                {
                    title: "Dashboard",
                    url: "/member/dashboard",
                },
                {
                    title: "Classes",
                    url: "/member/classes",
                },
                {
                    title: "Schedule",
                    url: "/member/schedule",
                },
                {
                    title: "Avalaible Package",
                    url: "/member/package",
                },
                {
                    title: "Vouchers",
                    url: "/member/vouchers",
                },
                {
                    title: "Point",
                    url: "/member/point-reward",
                },
                {
                    title: "Payment History",
                    url: "/member/payment",
                },
                {
                    title: "Profile",
                    url: "/member/profile",
                },
                {
                    title: "Settings",
                    url: "/member/settings",
                },
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
                    title: "Settings",
                    url: "/instructor/settings",
                },
                {
                    title: "Classes",
                    url: "/instructor/classes",
                },
                {
                    title: "Schedule",
                    url: "/instructor/jadwalPT",
                },
                {
                    title: "Payment",
                    url: "/instructor/payment",
                },
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
                    title: "Payroll",
                    url: "/finance/payroll",
                },
                {
                    title: "Invoice",
                    url: "/finance/invoice",
                },
                {
                    title: "Transaction",
                    url: "/finance/transaction",
                },
                {
                    title: "Report",
                    url: "/finance/report",
                },
                {
                    title: "Settings",
                    url: "/finance/settings",
                },
            ],
        },
        {
            title: "Employment",
            url: "/employment/dashboard",
            items: [
                {
                    title: "Dashboard",
                    url: "/employment/dashboard",
                },
                {
                    title: "Leave Management",
                    url: "/employment/leave-notice",
                },
                {
                    title: "Attedance Tracking",
                    url: "/employment/attedance",
                },
                {
                    title: "Settings",
                    url: "/employment/settings",
                },
            ],
        }
    ],
};