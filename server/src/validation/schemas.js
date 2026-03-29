const { z } = require('zod');

const schemas = {
  register: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(100),
    role: z.enum(['participant', 'organizer']),
  }),
  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  createQuiz: z.object({
    title: z.string().min(3).max(120),
    category: z.string().min(2).max(80),
    rules: z.string().min(3).max(1000),
    timePerQuestion: z.number().int().min(5).max(180),
  }),
  addQuestion: z.object({
    prompt: z.string().min(3).max(500),
    questionType: z.enum(['text', 'image']),
    imageUrl: z.string().max(1000).optional().or(z.literal('')),
    answerMode: z.enum(['single', 'multiple']),
    points: z.number().int().min(1).max(100),
    timeLimitSeconds: z.number().int().min(5).max(180).optional(),
    options: z
      .array(
        z.object({
          text: z.string().min(1).max(200),
          imageUrl: z.string().url().optional().or(z.literal('')),
          isCorrect: z.boolean(),
        }),
      )
      .min(2)
      .max(10),
  }),
  startSession: z.object({
    quizId: z.number().int().positive(),
  }),
  joinSession: z.object({
    roomCode: z.string().min(4).max(12),
  }),
};

module.exports = {
  schemas,
};
