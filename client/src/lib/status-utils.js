export function getSessionStatusMeta(status) {
  switch (status) {
    case 'waiting':
      return { label: 'Ожидание', tone: 'status-pill-waiting' };
    case 'active':
      return { label: 'Идет', tone: 'status-pill-active' };
    case 'finished':
      return { label: 'Завершен', tone: 'status-pill-finished' };
    default:
      return { label: 'Неизвестно', tone: 'status-pill-unknown' };
  }
}
