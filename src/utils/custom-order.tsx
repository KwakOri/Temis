import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

// 상태별 아이콘을 위한 공통 헬퍼 함수
export const getStatusIconHelper = (status: string) => {
  const iconClass = "w-4 h-4";
  switch (status) {
    case "pending":
      return <Clock className={`${iconClass} text-yellow-600`} />;
    case "accepted":
      return <CheckCircle className={`${iconClass} text-blue-600`} />;
    case "in_progress":
      return <AlertTriangle className={`${iconClass} text-indigo-600`} />;
    case "completed":
      return <CheckCircle className={`${iconClass} text-green-600`} />;
    case "cancelled":
      return <XCircle className={`${iconClass} text-red-600`} />;
    default:
      return null;
  }
};
