import type { NextAuthConfig } from "next-auth";

export default {
  secret: process.env.AUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    authorized({ auth, request }) {
      const isAuthenticated = !!auth;

      const isDashboardRoute =
        request.nextUrl.pathname.startsWith("/dashboard");

      const isAuthPage =
        request.nextUrl.pathname === "/login" ||
        request.nextUrl.pathname === "/signup";

      if (isDashboardRoute) {
        return isAuthenticated;
      }

      if (isAuthPage && isAuthenticated) {
        return Response.redirect(
          new URL("/dashboard", request.nextUrl.origin)
        );
      }

      return true;
    },
  },

  providers: [],
} satisfies NextAuthConfig;
