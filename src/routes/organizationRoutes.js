// Rotas para organizações
const express = require('express');
const organizationController = require('../controllers/organizationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(requireAuth);

router.get('/', organizationController.getOrganizations);
router.post('/', organizationController.createOrganization);
router.get('/:id', organizationController.getOrganization);
router.put('/:id', organizationController.updateOrganization);

// Gestão de membros
router.get('/:id/members', organizationController.getMembers);
router.post('/:id/members', organizationController.inviteMember);
router.put('/:id/members/:userId', organizationController.updateMemberRole);
router.delete('/:id/members/:userId', organizationController.removeMember);

module.exports = router;