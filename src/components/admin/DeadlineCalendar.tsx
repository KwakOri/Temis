import OrderDetailModal from "@/components/admin/OrderDetailModal";
import {
  useAdminCustomOrders,
  useAdminCustomOrdersCalendar,
  useAdminLegacyOrdersCalendar,
  useUpdateCustomOrderStatus,
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
  const [mobileTab, setMobileTab] = useState<'incomplete' | 'complete'>('incomplete');

  // 상세보기 모달 state 추가 (CustomOrder만 지원)
  const [selectedOrder, setSelectedOrder] = useState<CustomOrderWithUser | null>(
    null
  );
  const [showOrderModal, setShowOrderModal] = useState(false);

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

  // 미등록 일정을 가져오기 위해 전체 주문 목록 호출
  const { data: allCustomOrdersResponse, isLoading: loadingAllCustomOrders } =
    useAdminCustomOrders({ status: "all" });

  // 주문 업데이트 mutation
  const updateOrderMutation = useUpdateCustomOrderStatus();

  // 전체 주문에서 미등록 일정 필터링
  const allCustomOrders = allCustomOrdersResponse?.orders || [];
  const unscheduledCustomOrders = allCustomOrders.filter(
    (order) =>
      !order.deadline &&
      order.status !== "completed" &&
      order.status !== "cancelled"
  );

  // Extract orders from response objects
  const orders = customOrdersResponse?.orders || [];
  const legacyOrders = legacyOrdersResponse?.orders || [];

  // 데이터 로깅
  if (orders.length > 0) {
    console.log("=== DeadlineCalendar: 캘린더 주문 데이터 ===");
    console.log("Total orders:", orders.length);
    console.log("First order sample:", orders[0]);
    if (orders[0]) {
      console.log("First order - files:", orders[0].files);
      console.log("First order - selected_options:", orders[0].selected_options);
    }
  }

  const loading = loadingCustomCalendar || loadingLegacyCalendar || loadingAllCustomOrders;

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

  const allOrders = orders; // 캘린더에 표시될 주문 데이터

  const onOrderClick = (order: CustomOrderWithUser | LegacyOrderType) => {
    // CustomOrder만 상세보기 모달 열기 (LegacyOrder는 더 이상 지원하지 않음)
    if ("users" in order) {
      console.log("=== DeadlineCalendar: 선택된 주문 데이터 ===");
      console.log("Order ID:", order.id);
      console.log("Order Type: CustomOrder");
      console.log("Full Order Data:", order);
      console.log("--- CustomOrder 상세 정보 ---");
      console.log("User Info:", order.users);
      console.log("Selected Options:", order.selected_options);
      console.log("Files:", order.files);
      console.log("Files Length:", order.files?.length || 0);
      console.log("Design Keywords:", order.design_keywords);
      console.log("Has Character Images:", order.has_character_images);
      console.log("Wants Omakase:", order.wants_omakase);

      setSelectedOrder(order);
      setShowOrderModal(true);
    } else {
      console.log("=== DeadlineCalendar: 레거시 주문은 상세보기 미지원 ===");
      console.log("Order ID:", order.id);
      alert("레거시 주문은 상세보기를 지원하지 않습니다.");
    }
  };

  const onDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  // 주문 업데이트 핸들러 (CustomOrder만 지원)
  const handleUpdateOrder = async (
    orderId: string,
    status: string,
    notes?: string,
    price?: number,
    deadline?: string
  ) => {
    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        data: {
          status,
          admin_notes: notes,
          price_quoted: price,
          deadline,
        },
      });

      setShowOrderModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  };

  // 레거시 주문의 미등록 일정은 아직 API가 없으므로 빈 배열로 처리 (향후 구현 필요)
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              주문 마감일 관리
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-3 text-slate-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 완료/미완료 작업 분류
  const completeOrders = [...orders.filter(order => order.status === 'completed'), ...legacyOrders.filter(order => order.status === 'completed')];
  const incompleteOrders = [
    ...orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled'),
    ...legacyOrders.filter(order => order.status !== 'completed' && order.status !== 'cancelled')
  ];

  // 날짜순 정렬 (현재 날짜와 가까운 순)
  const sortByDate = (a: CustomOrderWithUser | LegacyOrderType, b: CustomOrderWithUser | LegacyOrderType) => {
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    const now = new Date().getTime();

    // 마감일이 없는 것은 맨 뒤로
    if (aDeadline === Infinity && bDeadline === Infinity) return 0;
    if (aDeadline === Infinity) return 1;
    if (bDeadline === Infinity) return -1;

    // 현재 날짜와의 차이 절대값으로 정렬
    return Math.abs(aDeadline - now) - Math.abs(bDeadline - now);
  };

  const sortedCompleteOrders = [...completeOrders].sort(sortByDate);
  const sortedIncompleteOrders = [...incompleteOrders].sort(sortByDate);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-primary flex items-center">
            <Calendar className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
            주문 마감일 관리
          </h3>
        </div>
      </div>

      {/* 데스크톱 캘린더 뷰 */}
      <div className="hidden lg:flex">
        {/* 왼쪽 패널 - 1/4 너비 */}
        <div className="w-1/4 border-r border-gray-200">
          {/* 미등록 작업 목록 */}
          <div className="p-4 border-b border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              미등록 작업 (
              {unscheduledCustomOrders.length + unscheduledLegacyOrders.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unscheduledCustomOrders.length === 0 &&
              unscheduledLegacyOrders.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">
                  모든 작업에 마감일이 설정되었습니다
                </p>
              ) : (
                <>
                  {/* 맞춤 제작 주문 */}
                  {unscheduledCustomOrders.map((order) => (
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

      {/* 모바일 리스트 뷰 */}
      <div className="lg:hidden">
        {/* 월 선택 컨트롤 */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-center">
              <span className="text-lg font-semibold text-gray-900">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </span>
            </div>

            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="다음 달"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setMobileTab('incomplete')}
              className={`flex-1 py-3 px-4 text-center text-sm font-medium border-b-2 transition-colors ${
                mobileTab === 'incomplete'
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              미완료 작업
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary text-white">
                {sortedIncompleteOrders.length}
              </span>
            </button>
            <button
              onClick={() => setMobileTab('complete')}
              className={`flex-1 py-3 px-4 text-center text-sm font-medium border-b-2 transition-colors ${
                mobileTab === 'complete'
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              완료 작업
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-600 text-white">
                {sortedCompleteOrders.length}
              </span>
            </button>
          </nav>
        </div>

        {/* 리스트 컨텐츠 */}
        <div className="divide-y divide-gray-200">
          {mobileTab === 'incomplete' ? (
            sortedIncompleteOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                미완료 작업이 없습니다
              </div>
            ) : (
              sortedIncompleteOrders.map((order) => {
                const isCustomOrder = 'users' in order;
                const isLegacy = !isCustomOrder;
                const daysUntilDeadline = order.deadline
                  ? Math.ceil((new Date(order.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
                const isUrgent = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 3;

                return (
                  <div
                    key={`mobile-incomplete-${order.id}`}
                    onClick={() => onOrderClick(order)}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="space-y-2">
                      {/* 헤더: 이름과 타입 */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {isCustomOrder
                              ? (order as CustomOrderWithUser).users.name
                              : (order as LegacyOrderType).nickname}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              isLegacy
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isLegacy ? '레거시' : '맞춤'}
                          </span>
                        </div>
                        {getStatusIconHelper(order.status)}
                      </div>

                      {/* 마감일 정보 */}
                      {order.deadline ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              isOverdue
                                ? 'bg-red-100 text-red-800'
                                : isUrgent
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {new Date(order.deadline).toLocaleDateString('ko-KR')}
                            {daysUntilDeadline !== null && (
                              <span className="ml-1">
                                ({isOverdue ? `${Math.abs(daysUntilDeadline)}일 초과` : `D-${daysUntilDeadline}`})
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">마감일 미설정</span>
                        </div>
                      )}

                      {/* 상태 */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.status === 'accepted'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'in_progress'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status === 'pending'
                            ? '대기중'
                            : order.status === 'accepted'
                            ? '접수됨'
                            : order.status === 'in_progress'
                            ? '진행중'
                            : order.status}
                        </span>
                      </div>

                      {/* 요구사항 (맞춤 제작만) */}
                      {isCustomOrder && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {(order as CustomOrderWithUser).order_requirements}
                        </p>
                      )}

                      {/* 이메일 (레거시만) */}
                      {isLegacy && (
                        <p className="text-xs text-gray-500">
                          {(order as LegacyOrderType).email}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            sortedCompleteOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                완료된 작업이 없습니다
              </div>
            ) : (
              sortedCompleteOrders.map((order) => {
                const isCustomOrder = 'users' in order;
                const isLegacy = !isCustomOrder;

                return (
                  <div
                    key={`mobile-complete-${order.id}`}
                    onClick={() => onOrderClick(order)}
                    className="p-4 hover:bg-gray-50 cursor-pointer bg-green-50/30"
                  >
                    <div className="space-y-2">
                      {/* 헤더: 이름과 타입 */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {isCustomOrder
                              ? (order as CustomOrderWithUser).users.name
                              : (order as LegacyOrderType).nickname}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              isLegacy
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isLegacy ? '레거시' : '맞춤'}
                          </span>
                        </div>
                        {getStatusIconHelper(order.status)}
                      </div>

                      {/* 마감일 정보 */}
                      {order.deadline && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600">
                            완료일: {new Date(order.deadline).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      )}

                      {/* 완료 상태 */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          완료
                        </span>
                      </div>

                      {/* 요구사항 (맞춤 제작만) */}
                      {isCustomOrder && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {(order as CustomOrderWithUser).order_requirements}
                        </p>
                      )}

                      {/* 이메일 (레거시만) */}
                      {isLegacy && (
                        <p className="text-xs text-gray-500">
                          {(order as LegacyOrderType).email}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* 주문 상세 모달 */}
      {showOrderModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrder(null);
          }}
          onUpdate={handleUpdateOrder}
          updating={updateOrderMutation.isPending}
        />
      )}
    </div>
  );
};
