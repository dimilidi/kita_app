"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/i18n/TranslationsProvider";

const LoginPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();

  const router = useRouter();
  const pathname = usePathname();
  const localeSegments = pathname.split("/").filter(Boolean);
  const locale = (localeSegments[0] === "en" || localeSegments[0] === "de"
    ? localeSegments[0]
    : "de") as "en" | "de";
  const dict = useTranslations();

  // useEffect(() => {
  //   const role = user?.publicMetadata.role;

  //   if (role) {
  //     router.push(`/${role}`);
  //   }
  // }, [user, router]);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      const role = user?.publicMetadata.role;

      if (role) {
        router.push(`/${locale}/${role}`);
      }
    }
  }, [isLoaded, isSignedIn, user, router, locale]);

  return (
    <div className="h-screen flex items-center justify-center bg-kitaSkyLight">
      <SignIn.Root>
        <SignIn.Step
          name="start"
          className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-2"
        >
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Image src="/logo.jpg" alt="" width={34} height={34} />
            {dict.signIn.appName}
          </h1>
          <h2 className="text-gray-400">{dict.signIn.title}</h2>
          <Clerk.GlobalError className="text-sm text-red-400" />
          <Clerk.Field name="identifier" className="flex flex-col gap-2">
            <Clerk.Label className="text-xs text-gray-500">
              {dict.signIn.username}
            </Clerk.Label>
            <Clerk.Input
              type="text"
              required
              className="p-2 rounded-md ring-1 ring-gray-300"
            />
            <Clerk.FieldError className="text-xs text-red-400" />
          </Clerk.Field>
          <Clerk.Field name="password" className="flex flex-col gap-2">
            <Clerk.Label className="text-xs text-gray-500">
              {dict.signIn.password}
            </Clerk.Label>
            <Clerk.Input
              type="password"
              required
              className="p-2 rounded-md ring-1 ring-gray-300"
            />
            <Clerk.FieldError className="text-xs text-red-400" />
          </Clerk.Field>
          <SignIn.Action
            submit
            className="bg-blue-500 text-white my-1 rounded-md text-sm p-[10px]"
          >
            {dict.signIn.button}
          </SignIn.Action>
        </SignIn.Step>
      </SignIn.Root>
    </div>
  );
};

export default LoginPage;
