import ClientProviders from "@/components/providers/ClientProviders";
import { PropsWithChildren } from "react";

const RootLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <ClientProviders>{children}</ClientProviders>
    </>
  );
};

export default RootLayout;
