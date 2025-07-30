import ClientProviders from "@/components/providers/ClientProviders";
import { Analytics } from "@vercel/analytics/next";
import { PropsWithChildren } from "react";

const RootLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <ClientProviders>{children}</ClientProviders>
      <Analytics />
    </>
  );
};

export default RootLayout;
