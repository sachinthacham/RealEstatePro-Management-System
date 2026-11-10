import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const agentController = new AgentController();

router.get('/', agentController.listAgents);
router.get('/:id/analytics', authenticate, agentController.getAgentAnalytics);
router.get('/:id', agentController.getAgentProfile);

export default router;
