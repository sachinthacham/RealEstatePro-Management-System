import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AgentService } from '../services/agent.service';
import { AppError } from '../utils/appError';

const agentService = new AgentService();

export class AgentController {
  listAgents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const result = await agentService.listAgents(Number(page), Number(limit), search as string | undefined);
      res.status(200).json({
        success: true,
        data: result.agents,
        pagination: { page: result.page, limit: Number(limit), total: result.total, totalPages: result.totalPages },
      });
    } catch (error) {
      next(error);
    }
  };

  getAgentProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = await agentService.getAgentProfile(req.params.id as string);
      res.status(200).json({ success: true, data: agent });
    } catch (error) {
      next(error);
    }
  };

  getAgentAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (req.user!.role !== 'admin' && req.user!._id.toString() !== id) {
        throw new AppError('You can only view your own analytics', 403);
      }
      const analytics = await agentService.getAgentAnalytics(id);
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  };
}
