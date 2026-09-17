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
  workoutCount: number; totalMinutes: number; totalSeconds: number; createdAt: string; updatedAt: string
  presence?: { online: boolean; lastOnlineAt?: string; lastOfflineAt?: string }
}

export type PresenceVisit = { id: number; onlineAt: string; offlineAt?: string; endReason?: string }

export type TrainingSet = { side: string; durationSeconds?: number; repetitions: number | null; springCount: number }
export type CourseExercise = { exerciseId: number; sets: TrainingSet[]; recommendedPlays?: number | null }
export type CourseRow = {
  id: number; title: string; type: string; durationMinutes: number; level: string; equipment: string
  summary: string; coverImage?: string; videoUrl?: string; videoCoverImage?: string
  videoDurationSeconds?: number; viewCount: number; status: Status; sortOrder: number
  exerciseIds: number[]; createdAt: string; updatedAt: string
  introduction?: string; audience?: string; trainingTags?: string; exercises?: CourseExercise[]
}

export type SpringCounts = { red: number; green: number; yellow: number; blue: number }

export type ExerciseRow = {
  focusImageUrl?: string; focusParts?: string; springSets?: number[]; springCounts?: SpringCounts | null; keyPoints?: string; commonMistakes?: string; instructionAudioUrl?: string
  id: number; name: string; bodyPart: string; level: string; equipment: string; suggestedSets: number
  target: string; cue: string; safetyTip: string; coverImage?: string; videoUrl?: string
  videoCoverImage?: string; videoDurationSeconds?: number; backgroundMusicUrl?: string; status: Status; sortOrder: number
  createdAt: string; updatedAt: string
}

export type PlanDayExercise = {
  id?: number; exerciseId: number; exerciseName?: string; repetitions: number; setCount: number; sortOrder: number
}
export type PlanDay = { id?: number; dayNumber: number; title: string; sortOrder: number; exercises: PlanDayExercise[] }
export type PlanRow = {
  id: number; title: string; weekNumber: number; sessionsPerWeek: number; cycleDays: number; description?: string
  subtitle?: string; coverImage?: string; detailImage?: string; homeImage?: string; level?: string; trainingScene?: string; sessionMinutes?: number
  benefitOne?: string; benefitTwo?: string; benefitThree?: string
  active: boolean; sortOrder: number; days: PlanDay[]; createdAt: string; updatedAt: string
}

export type CampaignRow = {
  id: number; code: string; title: string; rulesText: string; startDate?: string; endDate?: string
  bannerImage?: string; posterImage?: string
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
  boundAt?: string; unboundAt?: string
}

export type DeviceBatchCreateResult = {
  count: number; firstSerialNumber: string; lastSerialNumber: string
}

export type DeviceModelRow = {
  id: number; name: string; brand: string; snPrefix: string; imageUrl?: string | null; deviceCount: number; createdAt: string; updatedAt: string
}

export type AuditRow = {
  id: number; username: string; action: string; targetType: string; targetId?: number
  summary: string; ipAddress?: string; createdAt: string
}
