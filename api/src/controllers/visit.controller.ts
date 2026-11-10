import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { VisitService } from '../services/visit.service';

const visitService = new VisitService();

export class VisitController {
  createVisit = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const visit = await visitService.createVisit(req.user!._id.toString(), req.body);
      res.status(201).json({ success: true, data: visit });
    } catch (error) {
      next(error);
    }
  };

  getMyVisits = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const visits = await visitService.getMyVisits(req.user!._id.toString());
      res.status(200).json({ success: true, data: visits });
    } catch (error) {
      next(error);
    }
  };

  getAssignedVisits = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const visits = await visitService.getAssignedVisits(req.user!._id.toString());
      res.status(200).json({ success: true, data: visits });
    } catch (error) {
      next(error);
    }
  };

  updateVisitStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const visit = await visitService.updateVisitStatus(
        req.params.id as string,
        req.user!._id.toString(),
        req.user!.role,
        req.body
      );
      res.status(200).json({ success: true, data: visit });
    } catch (error) {
      next(error);
    }
  };
}
