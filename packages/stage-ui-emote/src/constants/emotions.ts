export enum Emotion {
  Happy = 'happy',
  Sad = 'sad',
  Angry = 'angry',
  Think = 'think',
  Surprise = 'surprised',
  Awkward = 'awkward',
  Question = 'question',
  Curious = 'curious',
  Neutral = 'neutral',
}

export const EMOTION_VALUES = Object.values(Emotion)

/**
 * Maps AIRI emotions to E-mote timeline labels.
 *
 * E-mote models store animations as named timelines. These names are
 * conventions — the actual labels available depend on the model's
 * timeline structure. The EmoteScene component falls back to the
 * default idle timeline when a label is not found.
 */
export const EmoteTimelineName = {
  Idle: '通常',
  Happy: '笑顔',
  Sad: '悲しい',
  Angry: '怒り',
  Awkward: '照れ',
  Think: '考え',
  Surprise: '驚き',
  Question: '疑問',
  Curious: '好奇',
  Neutral: '通常',
} as const

export type EmoteTimelineKey = keyof typeof EmoteTimelineName

/**
 * Maps an AIRI emotion to a canonical E-mote timeline label.
 */
export const EMOTION_EmoteTimelineName_value: Record<Emotion, string> = {
  [Emotion.Happy]: EmoteTimelineName.Happy,
  [Emotion.Sad]: EmoteTimelineName.Sad,
  [Emotion.Angry]: EmoteTimelineName.Angry,
  [Emotion.Think]: EmoteTimelineName.Think,
  [Emotion.Surprise]: EmoteTimelineName.Surprise,
  [Emotion.Awkward]: EmoteTimelineName.Awkward,
  [Emotion.Question]: EmoteTimelineName.Question,
  [Emotion.Neutral]: EmoteTimelineName.Neutral,
  [Emotion.Curious]: EmoteTimelineName.Curious,
}
