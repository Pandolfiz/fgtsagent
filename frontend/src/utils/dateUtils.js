// Função para verificar se uma data está incluída em um intervalo
export function isDateInRange(date, startDate, endDate) {
  const targetDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  console.log(`[DATE-RANGE-DEBUG] Verificando se ${targetDate.toISOString()} está entre ${start.toISOString()} e ${end.toISOString()}`);
  
  // Resetar horas para comparação apenas de data
  targetDate.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  const result = targetDate >= start && targetDate <= end;
  console.log(`[DATE-RANGE-DEBUG] Após reset de horas - Target: ${targetDate.toISOString()}, Start: ${start.toISOString()}, End: ${end.toISOString()}`);
  console.log(`[DATE-RANGE-DEBUG] Resultado: ${result}`);
  
  return result;
}

// Função para verificar se o filtro atual inclui a data de hoje
export function doesCurrentFilterIncludeToday(period, dateRange) {
  const today = new Date();
  
  console.log(`[FILTER-CHECK-DEBUG] Verificando filtro - Period: ${period}, DateRange:`, dateRange);
  console.log(`[FILTER-CHECK-DEBUG] Data de hoje: ${today.toISOString()}`);
  
  if (period === 'daily') {
    // Filtro diário sempre inclui hoje
    console.log(`[FILTER-CHECK-DEBUG] Period é 'daily' - retornando true`);
    return true;
  }
  
  if (period === 'weekly') {
    // Filtro semanal (domingo a sábado) - verificar se hoje está na semana atual
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const result = isDateInRange(today, startOfWeek, endOfWeek);
    console.log(`[FILTER-CHECK-DEBUG] Period é 'weekly' - resultado: ${result}`);
    return result;
  }
  
  if (period === 'monthly') {
    // Filtro mensal - verificar se hoje está no mês atual
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const result = isDateInRange(today, startOfMonth, endOfMonth);
    console.log(`[FILTER-CHECK-DEBUG] Period é 'monthly' - resultado: ${result}`);
    return result;
  }
  
  if (period === 'custom' && dateRange && dateRange.length > 0) {
    // Filtro customizado - verificar se hoje está no intervalo selecionado
    const start = dateRange[0].startDate;
    const end = dateRange[0].endDate;
    
    console.log(`[FILTER-CHECK-DEBUG] Period é 'custom' - Start: ${start?.toISOString()}, End: ${end?.toISOString()}`);
    
    if (start && end) {
      const result = isDateInRange(today, start, end);
      console.log(`[FILTER-CHECK-DEBUG] Period é 'custom' - resultado: ${result}`);
      return result;
    }
  }
  
  // Para outros casos, não atualizar
  console.log(`[FILTER-CHECK-DEBUG] Caso não tratado - retornando false`);
  return false;
}
