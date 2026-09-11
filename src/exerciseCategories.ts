export const EXERCISE_CATEGORIES = ['核心训练', '臀腿塑形', '肩背体态', '拉伸协调'] as const

export type ExerciseCategory = typeof EXERCISE_CATEGORIES[number]

const LEGACY_CATEGORIES: Record<string, ExerciseCategory> = {
  核心: '核心训练',
  臀腿: '臀腿塑形',
  下肢: '臀腿塑形',
  肩背: '肩背体态',
  全身: '拉伸协调',
  拉伸: '拉伸协调',
}

export function normalizeExerciseCategory(value?: string): ExerciseCategory | '' {
  const category = value?.trim() || ''
  if (EXERCISE_CATEGORIES.includes(category as ExerciseCategory)) return category as ExerciseCategory
  return Object.hasOwn(LEGACY_CATEGORIES, category) ? LEGACY_CATEGORIES[category] : ''
}

export function exerciseCategoryLabel(value?: string): string {
  return normalizeExerciseCategory(value) || '待分类'
}
