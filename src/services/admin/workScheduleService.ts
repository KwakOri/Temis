interface AdminWorkScheduleOrder {
  id: string;
  email_prefix: string;
  deadline: string | null;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  selected_options?: string;
  created_at: string;
  source: "internal" | "legacy";
}

interface GetWorkScheduleResponse {
  orders: AdminWorkScheduleOrder[];
}

export class AdminWorkScheduleService {
  private static baseUrl = '/api/admin/work-schedule'

  static async getWorkSchedule(): Promise<GetWorkScheduleResponse> {
    const response = await fetch(this.baseUrl, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('작업 일정을 가져오는데 실패했습니다.')
    }

    return response.json()
  }
}