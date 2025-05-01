let isDeleting = false;

async function deleteAgent(agentId) {
  if (isDeleting) return; // Evita cliques duplos
  
  try {
    isDeleting = true;
    const confirmDelete = confirm('Tem certeza que deseja excluir este agente?');
    
    if (confirmDelete) {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast('Agente excluído com sucesso!', 'success');
        loadAgents(); // Recarrega a lista de agentes
      } else {
        showToast(data.message || 'Erro ao excluir agente', 'error');
      }
    }
  } catch (error) {
    console.error('Erro ao excluir agente:', error);
    showToast('Erro ao excluir agente', 'error');
  } finally {
    isDeleting = false; // Reseta o flag após a conclusão
  }
} 