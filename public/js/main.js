async function deleteOrganization(organizationId) {
  try {
    const confirmDelete = confirm('Tem certeza que deseja excluir esta organização? Esta ação não pode ser desfeita e excluirá todos os agentes associados.');
    
    if (confirmDelete) {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast('Organização excluída com sucesso!', 'success');
        // Recarregar a página após excluir
        window.location.reload();
      } else {
        showToast(data.message || 'Erro ao excluir organização', 'error');
      }
    }
  } catch (error) {
    console.error('Erro ao excluir organização:', error);
    showToast('Erro ao excluir organização', 'error');
  }
} 