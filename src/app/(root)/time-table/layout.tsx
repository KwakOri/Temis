import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { PropsWithChildren } from "react";

const TimeTableLayout = ({ children }: PropsWithChildren) => {
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default TimeTableLayout;
