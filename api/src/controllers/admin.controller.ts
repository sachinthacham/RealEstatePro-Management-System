import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AdminService } from '../services/admin.service';

const adminService = new AdminService();

export class AdminController {
  createReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const report = await adminService.createReport(req.user!._id.toString(), req.body);
      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  listReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as 'open' | 'in_review' | 'resolved' | 'rejected' | undefined;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const result = await adminService.listReports(status, page, limit);
      res.status(200).json({ success: true, data: result.reports, pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      } });
    } catch (error) {
      next(error);
    }
  };

  updateReportStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const report = await adminService.updateReportStatus(
        req.params.id as string,
        req.user!._id.toString(),
        req.body.status,
        req.body.resolutionNote
      );
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await adminService.getDashboardSummary();
      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.query.role as 'user' | 'agent' | 'admin' | undefined;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const result = await adminService.listUsers(page, limit, role);

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const updated = await adminService.updateUserStatus(req.params.userId as string, req.body.isActive);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  listProperties = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const moderationStatus = req.query.moderationStatus as
        | 'pending'
        | 'approved'
        | 'rejected'
        | undefined;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const result = await adminService.listProperties(page, limit, moderationStatus);
      res.status(200).json({
        success: true,
        data: result.properties,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  moderateProperty = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const updated = await adminService.moderateProperty(
        req.params.propertyId as string,
        req.body.moderationStatus,
        req.body.moderationNotes
      );
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
