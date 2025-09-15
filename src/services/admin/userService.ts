import { GetUsersParams, GetUsersResponse, TemplateAccessWithUser } from '@/types/admin'

export class AdminUserService {
  private static baseUrl = '/api/admin'

  static async getUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
    const searchParams = new URLSearchParams()

    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    if (params.search) searchParams.append('search', params.search)

    const response = await fetch(`${this.baseUrl}/users?${searchParams.toString()}`)

    if (!response.ok) {
      throw new Error('사용자 목록을 가져오는데 실패했습니다.')
    }

    return response.json()
  }

  static async getUserTemplates(userId: string): Promise<{ templates: TemplateAccessWithUser[] }> {
    const response = await fetch(`${this.baseUrl}/user-templates?userId=${userId}`)

    if (!response.ok) {
      throw new Error('사용자 템플릿을 가져오는데 실패했습니다.')
    }

    return response.json()
  }
}