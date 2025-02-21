import { Users, UserCog, Package, User, UserPlus, Dumbbell, CreditCard } from 'lucide-react';

export const Menu = {
    navMain: [
        {
            title: "Management",
            url: "#",
            items: [
                {
                    title: "Personal Trainer",
                    url: "/management/personal-trainer",
                    icon: Users,
                },
                {
                    title: "Role",
                    url: "#",
                    icon: UserCog,
                },
                {
                    title: "Package",
                    url: "/management/package",
                    icon: Package,
                },
                {
                    title: "User",
                    url: "#",
                    icon: User,
                },
                {
                    title: "Member",
                    url: "/management/member",
                    icon: UserPlus,
                },
                {
                    title: "Class",
                    url: "#",
                    icon: Dumbbell,
                },
                {
                    title: "Payment",
                    url: "#",
                    icon: CreditCard,
                },
            ],
        },
        {
            title: "Administration",
            url: "/admin/dashboard",
            items: [
                {
                    title: "Dashboard",
                    url: "/admin/dashboard",
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
                    url: "/instructor/schedule",
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