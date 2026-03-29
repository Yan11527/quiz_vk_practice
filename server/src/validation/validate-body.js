function validateBody(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Некорректные данные запроса.',
      details: parsed.error.issues.map((issue) => issue.message),
    });
    return null;
  }

  return parsed.data;
}

module.exports = {
  validateBody,
};
