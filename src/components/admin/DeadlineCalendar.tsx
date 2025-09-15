import {
  useAdminCustomOrdersCalendar,
  useAdminLegacyOrdersCalendar,
} from "@/hooks/query/useAdminOrders";
import {
  CustomOrderWithUser,
  LegacyOrder as LegacyOrderType,
} from "@/types/admin";
import { LegacyOrderLocal } from "@/types/customOrder";
import { getStatusIconHelper } from "@/utils/custom-order";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useState } from "react";

// 데드라인 캘린더 뷰 컴포넌트 - 이제 내부에서 데이터를 관리
export const DeadlineCalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOrderForDeadline, setSelectedOrderForDeadline] = useState<
    CustomOrderWithUser | LegacyOrderType | null
  >(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);

  // React Query hooks
  const { data: customOrdersResponse, isLoading: loadingCustomCalendar } =
    useAdminCustomOrdersCalendar(
      currentDate.getFullYear(),
      currentDate.getMonth()
    );

  const { data: legacyOrdersResponse, isLoading: loadingLegacyCalendar } =
    useAdminLegacyOrdersCalendar(
      currentDate.getFullYear(),
      currentDate.getMonth()
    );

  // Extract orders from response objects
  const orders = customOrdersResponse?.orders || [];
  const legacyOrders = legacyOrdersResponse?.orders || [];

  console.log("customOrdersResponse => ", customOrdersResponse);
  console.log("orders => ", orders);

  const loading = loadingCustomCalendar || loadingLegacyCalendar;

  // 긴급 작업 계산 (3일 이내) - 완료된 작업과 취소된 작업 제외
  const urgentOrders = orders.filter((order: CustomOrderWithUser) => {
    if (!order.deadline) return false;
    if (order.status === "completed" || order.status === "cancelled") return false;
    const deadline = new Date(order.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  const urgentLegacyOrders = legacyOrders.filter((order: LegacyOrderType) => {
    if (!order.deadline) return false;
    if (order.status === "completed" || order.status === "cancelled") return false;
    const deadline = new Date(order.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  const allOrders = orders; // 전체 주문 데이터

  const onOrderClick = (order: CustomOrderWithUser | LegacyOrderType) => {
    setSelectedOrderForDeadline(order);
    setShowDeadlineModal(true);
  };

  const onDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  // 마감기한이 없는 주문들 (전체 주문 데이터에서 조회)
  const unscheduledOrders = allOrders.filter(
    (order) =>
      !order.deadline &&
      order.status !== "completed" &&
      order.status !== "cancelled"
  );

  // 레거시 주문은 별도 상태에서 관리되지 않으므로 빈 배열로 처리 (필요시 추가 구현)
  const unscheduledLegacyOrders: LegacyOrderLocal[] = [];

  // 마감기한별로 주문 그룹핑 (맞춤 제작 + 레거시) - 취소된 주문 제외
  const ordersByDate = orders
    .filter((order) => order.deadline && order.status !== "cancelled")
    .reduce((acc, order) => {
      const dateKey = order.deadline!;
      if (!acc[dateKey]) {
        acc[dateKey] = { custom: [], legacy: [] };
      }
      acc[dateKey].custom.push(order);
      return acc;
    }, {} as Record<string, { custom: CustomOrderWithUser[]; legacy: LegacyOrderType[] }>);

  // 레거시 주문도 날짜별 그룹핑에 추가 - 취소된 주문 제외
  legacyOrders
    .filter((order) => order.deadline && order.status !== "cancelled")
    .forEach((order) => {
      const dateKey = order.deadline!;
      if (!ordersByDate[dateKey]) {
        ordersByDate[dateKey] = { custom: [], legacy: [] };
      }
      ordersByDate[dateKey].legacy.push(order);
    });

  // 긴급도별로 정렬된 주문들 (현재 날짜 기준 3일 이내, 별도 상태에서 관리)
  const urgentCustomOrders = urgentOrders.sort(
    (a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
  );

  const urgentLegacyOrdersSorted = urgentLegacyOrders.sort(
    (a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
  );

  // 캘린더 날짜 계산
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  const calendarDays = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    calendarDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const prevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            주문 마감일 관리
          </h3>
        </div>
      </div>

      <div className="flex">
        {/* 왼쪽 패널 - 1/4 너비 */}
        <div className="w-1/4 border-r border-gray-200">
          {/* 미등록 작업 목록 */}
          <div className="p-4 border-b border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              미등록 작업 (
              {unscheduledOrders.length + unscheduledLegacyOrders.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unscheduledOrders.length === 0 &&
              unscheduledLegacyOrders.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">
                  모든 작업에 마감일이 설정되었습니다
                </p>
              ) : (
                <>
                  {/* 맞춤 제작 주문 */}
                  {unscheduledOrders.map((order) => (
                    <div
                      key={`custom-${order.id}`}
                      onClick={() => onOrderClick(order)}
                      className="p-2 rounded-md cursor-pointer transition-colors bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {order.users.name}
                            </p>
                            <span
                              className="text-xs text-blue-600 bg-blue-100 px-1 rounded"
                              title="맞춤 제작"
                            >
                              C
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {order.order_requirements.slice(0, 30)}...
                          </p>
                        </div>
                        <div className="ml-2 flex items-center">
                          {getStatusIconHelper(order.status)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 레거시 주문 */}
                  {unscheduledLegacyOrders.map((order) => (
                    <div
                      key={`legacy-${order.id}`}
                      className="p-2 rounded-md cursor-pointer transition-colors bg-gray-50 border-l-2 border-gray-400 hover:bg-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {order.nickname}
                            </p>
                            <span
                              className="text-xs text-gray-600 bg-gray-200 px-1 rounded"
                              title="레거시 주문"
                            >
                              L
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {order.email}
                          </p>
                        </div>
                        <div className="ml-2 flex items-center">
                          {getStatusIconHelper(order.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 긴급 작업 스택 */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-red-600 mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              긴급 작업 (
              {urgentCustomOrders.length + urgentLegacyOrdersSorted.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {urgentCustomOrders.length === 0 &&
              urgentLegacyOrdersSorted.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">
                  긴급 작업이 없습니다
                </p>
              ) : (
                <>
                  {/* 맞춤 제작 긴급 주문 */}
                  {urgentCustomOrders.map((order, index) => (
                    <div
                      key={`urgent-custom-${order.id}`}
                      onClick={() => onOrderClick(order)}
                      className={`p-3 rounded-md cursor-pointer transition-colors border-l-4 ${
                        new Date(order.deadline!) < new Date()
                          ? "bg-red-50 border-red-500 hover:bg-red-100"
                          : "bg-yellow-50 border-yellow-500 hover:bg-yellow-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-900">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {order.users.name}
                            </span>
                            <span
                              className="text-xs text-blue-600 bg-blue-100 px-1 rounded"
                              title="맞춤 제작"
                            >
                              C
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            마감:{" "}
                            {new Date(order.deadline!).toLocaleDateString(
                              "ko-KR"
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {order.order_requirements.slice(0, 25)}...
                          </p>
                        </div>
                        <div className="ml-2">
                          {getStatusIconHelper(order.status)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 레거시 긴급 주문 */}
                  {urgentLegacyOrdersSorted.map((order, index) => (
                    <div
                      key={`urgent-legacy-${order.id}`}
                      className={`p-3 rounded-md cursor-pointer transition-colors border-l-4 ${
                        new Date(order.deadline!) < new Date()
                          ? "bg-red-50 border-red-500 hover:bg-red-100"
                          : "bg-yellow-50 border-yellow-500 hover:bg-yellow-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-900">
                              #{urgentCustomOrders.length + index + 1}
                            </span>
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {order.nickname}
                            </span>
                            <span
                              className="text-xs text-gray-600 bg-gray-200 px-1 rounded"
                              title="레거시 주문"
                            >
                              L
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            마감:{" "}
                            {new Date(order.deadline!).toLocaleDateString(
                              "ko-KR"
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {order.email}
                          </p>
                        </div>
                        <div className="ml-2">
                          {getStatusIconHelper(order.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽 캘린더 영역 - 3/4 너비 */}
        <div className="flex-1 p-4">
          {/* 캘린더 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              {currentDate.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
              })}
            </h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={prevMonth}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 캘린더 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dateKey = `${date.getFullYear()}-${String(
                date.getMonth() + 1
              ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              const dayOrderData = ordersByDate[dateKey] || {
                custom: [],
                legacy: [],
              };
              const allDayOrders = [
                ...dayOrderData.custom,
                ...dayOrderData.legacy,
              ];
              const isCurrentMonth = date.getMonth() === month;
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[100px] p-1 border border-gray-100 ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50"
                  } ${isToday ? "ring-2 ring-blue-500 ring-opacity-50" : ""}`}
                >
                  <div
                    className={`text-sm ${
                      isCurrentMonth ? "text-gray-900" : "text-gray-400"
                    } ${isToday ? "font-bold text-blue-600" : ""}`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {allDayOrders.slice(0, 3).map((order) => {
                      console.log("current_order => ", order);
                      const isLegacy = !("users" in order);
                      const isCustomOrder = "users" in order;

                      return (
                        <div
                          key={order.id}
                          onClick={() => onOrderClick(order)}
                          className={`text-xs p-1 rounded cursor-pointer truncate relative ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : new Date(order.deadline!) < new Date()
                              ? "bg-red-100 text-red-800 hover:bg-red-200"
                              : isLegacy
                              ? "bg-gray-100 text-gray-800 hover:bg-gray-200 border-l-2 border-gray-400"
                              : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">
                              {isCustomOrder
                                ? (order as CustomOrderWithUser).users.name
                                : (order as LegacyOrderType).nickname}
                            </span>
                            <span
                              className="text-xs text-gray-500 ml-1"
                              title={
                                isLegacy ? "레거시 주문" : "맞춤 제작 주문"
                              }
                            >
                              {isLegacy ? "L" : "C"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {allDayOrders.length > 3 && (
                      <div className="text-xs text-gray-500 p-1">
                        +{allDayOrders.length - 3}개 더
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
