import Link from "next/link";
import { redirect } from "next/navigation";

import { getOwnerSession } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const ownerSession = await getOwnerSession();

  if (!ownerSession) {
    redirect("/dashboard");
  }

  const [registeredUsers, accounts] = await Promise.all([
    prisma.user.count(),
    prisma.webAccount.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        email: true,
        userId: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1 pb-24 lg:pb-8">
        <div className="mx-auto max-w-7xl p-4 sm:p-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to dashboard
          </Link>

          <header className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                Website Owner
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                Administration
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Review Minderra and its registered accounts.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Signed in as{" "}
              <span className="font-semibold text-slate-900">
                {ownerSession.user.email}
              </span>
            </div>
          </header>

          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Registered users
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950">
                {registeredUsers}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                User records in the application database
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Accounts shown
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950">
                {accounts.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Most recent 25 web accounts
              </p>
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Recent accounts
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Read-only overview. Passwords and authentication secrets are never displayed.
              </p>
            </div>

            {accounts.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                No web accounts were found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Email</th>
                      <th className="px-5 py-3 font-semibold">User ID</th>
                      <th className="px-5 py-3 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((account) => (
                      <tr key={account.email}>
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {account.email}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-500">
                          {account.userId}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {account.createdAt.toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="mt-6 text-xs leading-5 text-slate-500">
            This initial admin area is read-only. It does not delete accounts
            or change other users' permissions.
          </p>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
