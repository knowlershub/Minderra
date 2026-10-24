"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getGmailConnectionStatus } from "@/lib/dashboardApi";

const navigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: "₦",
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    icon: "✓",
  },
  {
    label: "InboxZero",
    href: "/dashboard/inbox",
    icon: "✉",
  },
  {
    label: "Wishlist",
    href: "/dashboard/wishlist",
    icon: "☆",
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: "🔔",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const {
    data: session,
    status: sessionStatus,
  } = useSession();

  const isOwner = session?.user?.isOwner === true;
  const canAdminister = session?.user?.isAdmin === true;

  const visibleNavigation = canAdminister
    ? [
        ...navigation,
        {
          label: "Administration",
          href: "/dashboard/admin",
          icon: "⚙",
        },
      ]
    : navigation;

  const [gmailConnected, setGmailConnected] =
    useState(false);

  const [gmailEmail, setGmailEmail] =
    useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      setGmailConnected(false);
      setGmailEmail(null);
      return;
    }

    getGmailConnectionStatus()
      .then((status) => {
        setGmailConnected(
          status.connected &&
            !status.expired &&
            !status.needsReauth
        );

        setGmailEmail(
          status.emailAddress
        );
      })
      .catch(() => {
        setGmailConnected(false);
        setGmailEmail(null);
      });
  }, [sessionStatus]);

  async function handleLogout() {
    await signOut({
      callbackUrl: "/login",
    });
  }

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-slate-950 text-white lg:flex">
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold">
            T
          </div>

          <div>
            <div className="text-lg font-bold tracking-tight">
              Minderra
            </div>

            <div className="text-xs text-slate-400">
              Life OS
            </div>
            {canAdminister && (
              <div className="mt-1 text-xs font-semibold text-amber-300">
                {isOwner ? "Website Owner" : "Administrator"}
              </div>
            )}
          </div>
        </Link>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Command Center
        </div>

        <nav className="space-y-1">
          {visibleNavigation.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm">
                  {item.icon}
                </span>

                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mb-3 mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Connections
        </div>

        <div className="space-y-3 px-3">
          <ConnectionStatus
            label="WhatsApp"
            connected={false}
            statusText="Coming soon"
          />

          <div>
            <ConnectionStatus
              label="Gmail"
              connected={gmailConnected}
            />

            {gmailConnected &&
              gmailEmail && (
                <p
                  className="mt-1 truncate pl-1 text-[10px] text-slate-500"
                  title={gmailEmail}
                >
                  {gmailEmail}
                </p>
              )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <a
          href="https://t.me/+ZWWQ5O-a0c9lNDU0"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join the Minderra Telegram Community (opens in a new tab)"
          className="block rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-3 transition hover:bg-sky-400/15"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-sky-200">
            <span aria-hidden="true">➤</span>
            Join our community ↗
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">
            Minderra news, updates and discussions
          </span>
        </a>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Account
        </div>

        <Link
          href="/dashboard/profile"
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
            pathname.startsWith(
              "/dashboard/profile"
            )
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            👤
          </span>

          Profile
        </Link>

        <Link
          href="/dashboard/settings"
          className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
            pathname.startsWith(
              "/dashboard/settings"
            )
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            ⚙
          </span>

          Settings
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            ↪
          </span>

          Log out
        </button>
      </div>
    </aside>
  );
}

function ConnectionStatus({
  label,
  connected,
  statusText,
}: {
  label: string;
  connected: boolean;
  statusText?: string;
}) {
  const displayText =
    statusText ??
    (connected
      ? "Connected"
      : "Not connected");

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">
        {label}
      </span>

      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            connected
              ? "bg-emerald-400"
              : "bg-slate-600"
          }`}
        />

        <span
          className={`text-xs ${
            connected
              ? "text-emerald-400"
              : "text-slate-500"
          }`}
        >
          {displayText}
        </span>
      </div>
    </div>
  );
}