"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Users, CreditCard, UserCog } from "lucide-react";
import { api } from "@/trpc/react";

const DashboardPage: React.FC = () => {
  const { data: memberData, isLoading: memberLoading } =
    api.member.list.useQuery({
      page: 1,
      limit: 100,
      search: "",
      searchColumn: "isActive",
    });

  const { data: employeeData, isLoading: employeeLoading } =
    api.employee.list.useQuery({
      page: 1,
      limit: 1,
      search: "",
      searchColumn: "",
    });

  const { data: transactionData, isLoading: transactionLoading } =
    api.subs.list.useQuery({
      page: 1,
      limit: 5,
    });

  const activeMembers =
    memberData?.items.filter((member) => member.isActive).length ?? 0;
  const totalEmployees = employeeData?.total ?? 0;
  const latestTransactions = transactionData?.items ?? [];

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome, Admin!</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-500/20 p-3">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Members</p>
              <h2 className="text-2xl font-bold">
                {memberLoading ? "..." : activeMembers}
              </h2>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-500/20 p-3">
              <UserCog className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <h2 className="text-2xl font-bold">
                {employeeLoading ? "..." : totalEmployees}
              </h2>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-500/20 p-3">
              <CreditCard className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Latest Transactions
              </p>
              <h2 className="text-2xl font-bold">
                {transactionLoading ? "..." : latestTransactions.length}
              </h2>
            </div>
          </div>
        </Card>
      </div>

      {latestTransactions.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Transactions</h3>
          <div className="space-y-4">
            {latestTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between border-b pb-2"
              >
                <div>
                  <p className="font-medium">{transaction.member.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.package.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    Rp {transaction.package.price.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.payments[0]
                      ? new Date(
                          transaction.payments[0].createdAt,
                        ).toLocaleDateString()
                      : "No payment date"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
