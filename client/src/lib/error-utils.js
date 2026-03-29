export function extractApiError(error, fallback = 'Произошла ошибка запроса.') {
  return error?.response?.data?.error || fallback;
}
