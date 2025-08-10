// Função para verificar se uma data está incluída em um intervalo
export function isDateInRange(date, startDate, endDate) {
  const targetDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Resetar horas para comparação apenas de data
  targetDate.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return targetDate >= start && targetDate <= end;
}

// Função para verificar se o filtro atual inclui a data de hoje
export function doesCurrentFilterIncludeToday(period, dateRange) {
  const today = new Date();
  
  if (period === 'daily') {
    // Filtro diário sempre inclui hoje
    return true;
  }
  
  if (period === 'weekly') {
    // Filtro semanal (domingo a sábado) - verificar se hoje está na semana atual
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return isDateInRange(today, startOfWeek, endOfWeek);
  }
  
  if (period === 'monthly') {
    // Filtro mensal - verificar se hoje está no mês atual
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return isDateInRange(today, startOfMonth, endOfMonth);
  }
  
  if (period === 'custom' && dateRange && dateRange.length > 0) {
    // Filtro customizado - verificar se hoje está no intervalo selecionado
    const start = dateRange[0].startDate;
    const end = dateRange[0].endDate;
    
    if (start && end) {
      return isDateInRange(today, start, end);
    }
  }
  
  // Para outros casos, não atualizar
  return false;
}
