"use client";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useState } from "react";

import { getFirebaseClientAuth } from "@/lib/firebaseClient";

type TestResult = {
  ok?: boolean;
  uid?: string;
  email?: string | null;
  name?: string | null;
  emailVerified?: boolean;
  provider?: string;
  error?: string;
};

export default function FirebaseTestPage() {
  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<TestResult | null>(null);

  async function handleGoogleTest() {
    setLoading(true);
    setMessage(null);
    setResult(null);

    try {
      const auth =
        getFirebaseClientAuth();

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      const credential =
        await signInWithPopup(
          auth,
          provider
        );

      const idToken =
        await credential.user.getIdToken(
          true
        );

      const response =
        await fetch(
          "/api/firebase-test",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              idToken,
            }),
          }
        );

      const data =
        (await response.json()) as TestResult;

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Firebase verification failed."
        );
      }

      setResult(data);
      setMessage(
        "Firebase Google authentication is working."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Firebase test failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(
        getFirebaseClientAuth()
      );
      setResult(null);
      setMessage(
        "Firebase test session signed out."
      );
    } catch {
      setMessage(
        "Unable to sign out of Firebase."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">
          Firebase Google Test
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          This is a temporary test page. It does not
          replace Minderra's normal login.
        </p>

        {message && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {message}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleTest}
            disabled={loading}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading
              ? "Connecting to Google..."
              : "Test Google with Firebase"}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Sign out of Firebase test
          </button>
        </div>

        {result?.ok && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p>
              <strong>UID:</strong>{" "}
              {result.uid}
            </p>

            <p className="mt-1">
              <strong>Email:</strong>{" "}
              {result.email ?? "—"}
            </p>

            <p className="mt-1">
              <strong>Name:</strong>{" "}
              {result.name ?? "—"}
            </p>

            <p className="mt-1">
              <strong>Email verified:</strong>{" "}
              {result.emailVerified
                ? "Yes"
                : "No"}
            </p>

            <p className="mt-1">
              <strong>Provider:</strong>{" "}
              {result.provider}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
