import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

class EmailNotFoundError extends CredentialsSignin {
  code = "email_not_found";
}

class WrongPasswordError extends CredentialsSignin {
  code = "wrong_password";
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class UserNotFoundError extends CredentialsSignin {
  code = "user_not_found";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findOrCreateOAuthUser({
  email,
  name,
  provider,
  providerAccountId,
}: {
  email: string;
  name: string | null | undefined;
  provider: string;
  providerAccountId: string;
}) {
  const normalizedEmail = normalizeEmail(email);

  const existingOAuthAccount =
    await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });

  if (existingOAuthAccount) {
    const displayName = name?.trim();

    if (
      displayName &&
      displayName !== existingOAuthAccount.user.displayName
    ) {
      return prisma.user.update({
        where: {
          id: existingOAuthAccount.userId,
        },
        data: {
          displayName,
        },
      });
    }

    return existingOAuthAccount.user;
  }

  const existingWebAccount =
    await prisma.webAccount.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

  let user = existingWebAccount
    ? await prisma.user.findUnique({
        where: {
          id: existingWebAccount.userId,
        },
      })
    : null;

  if (!user) {
    user = await prisma.user.create({
      data: {
        displayName:
          name?.trim() ||
          normalizedEmail.split("@")[0],
      },
    });

    await prisma.webAccount.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        passwordHash: null,
      },
    });
  } else if (
    name?.trim() &&
    user.displayName !== name.trim()
  ) {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        displayName: name.trim(),
      },
    });
  }

  await prisma.oAuthAccount.create({
    data: {
      userId: user.id,
      provider,
      providerAccountId,
    },
  });

  return user;
}

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  ...authConfig,

  session: {
    strategy: "jwt",
  },

  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID ??
        process.env.GOOGLE_CLIENT_ID ??
        "",

      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ??
        process.env.GOOGLE_CLIENT_SECRET ??
        "",

      authorization: {
        params: {
          prompt: "select_account",
          scope: "openid email profile",
        },
      },
    }),

    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const email = normalizeEmail(
          String(credentials?.email ?? "")
        );

        const password = String(
          credentials?.password ?? ""
        );

        if (!email || !password) {
          throw new InvalidCredentialsError();
        }

        const account =
          await prisma.webAccount.findUnique({
            where: {
              email,
            },
          });

        if (!account) {
          throw new EmailNotFoundError();
        }

        if (!account.passwordHash) {
          throw new InvalidCredentialsError();
        }

        const passwordMatches =
          await bcrypt.compare(
            password,
            account.passwordHash
          );

        if (!passwordMatches) {
          throw new WrongPasswordError();
        }

        const user =
          await prisma.user.findUnique({
            where: {
              id: account.userId,
            },
          });

        if (!user) {
          throw new UserNotFoundError();
        }

        return {
          id: user.id,
          name: user.displayName,
          email: account.email,
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async signIn({
      user,
      account,
    }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = user.email
        ? normalizeEmail(user.email)
        : "";

      const providerAccountId =
        account.providerAccountId?.trim() ?? "";

      if (!email || !providerAccountId) {
        console.error(
          "[Google sign-in] Missing required identity data:",
          {
            provider: account.provider,
            hasEmail: Boolean(email),
            hasProviderAccountId:
              Boolean(providerAccountId),
          }
        );

        return false;
      }

      const dbUser =
        await findOrCreateOAuthUser({
          email,
          name: user.name,
          provider: account.provider,
          providerAccountId,
        });

      user.id = dbUser.id;
      user.name = dbUser.displayName;
      user.email = email;

      return true;
    },

    async jwt({
      token,
      user,
    }) {
      if (user?.id) {
        token.userId = user.id;
      }

      return token;
    },

    async session({
      session,
      token,
    }) {
      if (
        session.user &&
        token.userId
      ) {
        session.user.id = String(
          token.userId
        );
      }

      return session;
    },
  },
});
