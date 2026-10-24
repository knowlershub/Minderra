"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import {
  getDashboardData,
  updateProfile,
  type DashboardData,
} from "@/lib/dashboardApi";

export default function ProfilePage() {
  const { data: session } = useSession();

  const [data, setData] = useState<DashboardData | null>(null);

  const [displayName, setDisplayName] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadProfile() {
const freshData = await getDashboardData();
    setData(freshData);
    setDisplayName(
      freshData.user.displayName?.trim() || "Minderra User"
    );
  }

  useEffect(() => {
    loadProfile().catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load profile."
      );
    });
  }, []);

  async function saveProfile() {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setError("Display name cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await updateProfile(trimmedName);
    

      setDisplayName(
        result.user.displayName || trimmedName
      );

      setData((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                displayName: result.user.displayName,
              },
            }
          : current
      );

      setEditing(false);
      setMessage("Profile updated successfully.");

      window.setTimeout(() => {
        setMessage(null);
      }, 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setDisplayName(
      data?.user.displayName?.trim() || "Minderra User"
    );

    setEditing(false);
    setError(null);
  }

  const currentName =
    data?.user.displayName?.trim() || "Minderra User";

  const initials =
    currentName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TG";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <header className="mb-8">
              <p className="text-sm font-medium text-slate-500">
                Account
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                Profile
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Your Minderra identity and account information.
              </p>
            </header>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                {message}
              </div>
            )}

            {!data && !error && (
              <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
            )}

            {data && (
              <div className="space-y-6">
                {/* Profile card */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-5">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-blue-600 text-2xl font-bold text-white">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        {editing ? (
                          <div>
                            <label
                              htmlFor="profile-display-name"
                              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                              Display name
                            </label>

                            <input
                              id="profile-display-name"
                              type="text"
                              value={displayName}
                              onChange={(event) =>
                                setDisplayName(
                                  event.target.value
                                )
                              }
                              maxLength={80}
                              autoFocus
                              className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              placeholder="Your name"
                            />

                            <p className="mt-2 text-xs text-slate-400">
                              {displayName.length}/80 characters
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="truncate text-2xl font-bold text-slate-950">
                              {currentName}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Minderra account
                            </p>
                          </>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Account active
                          </span>

                          {session?.user?.isOwner === true && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                              Website Owner
                            </span>
                          )}

                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={saveProfile}
                            disabled={saving}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50"
                          >
                            {saving
                              ? "Saving..."
                              : "Save changes"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(true);
                            setError(null);
                            setMessage(null);
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit profile
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* Account details */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="font-semibold text-slate-950">
                      Account details
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Information currently associated with your Minderra
                      user.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <ProfileRow
                      label="Display name"
                      value={currentName}
                    />

                    <ProfileRow
                      label="User ID"
                      value={data.user.id}
                      mono
                    />

                    <ProfileRow
                      label="WhatsApp connection"
                      value="Managed through Minderra backend"
                    />

                    <ProfileRow
                      label="Gmail connection"
                      value="Managed through Gmail OAuth"
                    />
                  </div>
                </section>

              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

function ProfileRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`text-sm font-semibold text-slate-900 ${
          mono ? "break-all font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}