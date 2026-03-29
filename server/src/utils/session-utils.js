function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function sortNumeric(values) {
  return [...values].sort((a, b) => a - b);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function getRoomChannel(roomCode) {
  return `room:${roomCode}`;
}

function toPublicQuestion(question, remainingSeconds = null) {
  return {
    id: question.id,
    position: question.position,
    prompt: question.prompt,
    questionType: question.question_type,
    imageUrl: question.image_url,
    answerMode: question.answer_mode,
    points: question.points,
    timeLimitSeconds: question.effective_time_limit,
    remainingSeconds,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      imageUrl: option.image_url,
    })),
  };
}

module.exports = {
  randomRoomCode,
  sortNumeric,
  arraysEqual,
  getRoomChannel,
  toPublicQuestion,
};
