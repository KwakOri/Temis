import { WorkScheduleResponse } from '@/types/workSchedule'

export class WorkScheduleService {
  private static baseUrl = '/api/work-schedule'

  static async getWorkSchedule(): Promise<WorkScheduleResponse> {
    const response = await fetch(this.baseUrl, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('작업 일정표를 가져오는데 실패했습니다.')
    }

    return response.json()
  }
}