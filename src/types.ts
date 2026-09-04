export type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number }
export type Status = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type Dashboard = {
  userCount: number
  weeklyNewUsers: number
  weeklyWorkoutCount: number
  courseCount: number
  pendingFeedbackCount: number
  todayOnlineCount: number
  currentOnlineCount: number
  workoutTrend: { date: string; count: number }[]
  onlineTrend: { date: string; count: number }[]
  recentContent: { id: number; title: string; kind: string; status: string; updatedAt: string }[]
}

export type UserRow = {
  id: number; nickname?: string; phone?: string; avatarUrl?: string; status: string
  workoutCount: number; totalMinutes: number; createdAt: string; updatedAt: string
}

export type CourseRow = {
  id: number; title: string; type: string; durationMinutes: number; level: string; equipment: string
  summary: string; coverImage?: string; videoUrl?: string; videoCoverImage?: string
  videoDurationSeconds?: number; viewCount: number; status: Status; sortOrder: number
  exerciseIds: number[]; createdAt: string; updatedAt: string
}

export type ExerciseRow = {
  id: number; name: string; bodyPart: string; level: string; equipment: string; suggestedSets: number
  target: string; cue: string; safetyTip: string; coverImage?: string; videoUrl?: string
  videoCoverImage?: string; videoDurationSeconds?: number; backgroundMusicUrl?: string; status: Status; sortOrder: number
  createdAt: string; updatedAt: string
}

export type PlanItem = { id?: number; courseId: number; courseTitle?: string; dayOffset: number; sortOrder: number }
export type PlanRow = {
  id: number; title: string; weekNumber: number; sessionsPerWeek: number; description?: string
  subtitle?: string; coverImage?: string; level?: string; trainingScene?: string; sessionMinutes?: number
  benefitOne?: string; benefitTwo?: string; benefitThree?: string
  active: boolean; sortOrder: number; items: PlanItem[]; createdAt: string; updatedAt: string
}

export type CampaignRow = {
  id: number; code: string; title: string; rulesText: string; startDate?: string; endDate?: string
  status: Status; sortOrder: number; checkinCount: number; createdAt: string; updatedAt: string
}

export type WorkoutRow = {
  id: number; userId: number; userName: string; courseId: number; courseTitle: string
  durationMinutes: number; completionPercent: number; startedAt: string; completedAt: string
}

export type FeedbackRow = {
  id: number; userId: number; userName: string; category: string; content: string
  contact?: string; status: string; createdAt: string
}

export type DeviceRow = {
  id: number; serialNumber: string; deviceModel: string; brand?: string; deviceName?: string
  deviceSource: 'OWN' | 'THIRD_PARTY'; bound: boolean; boundUserId?: number
  boundUserName?: string; boundUserPhone?: string; createdAt: string; updatedAt: string
}

export type DeviceBatchCreateResult = {
  count: number; firstSerialNumber: string; lastSerialNumber: string
}

export type DeviceModelRow = {
  id: number; name: string; snPrefix: string; deviceCount: number; createdAt: string; updatedAt: string
}

export type AuditRow = {
  id: number; username: string; action: string; targetType: string; targetId?: number
  summary: string; ipAddress?: string; createdAt: string
}
