import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { InquiryService } from '../services/inquiry.service';

const inquiryService = new InquiryService();

export class InquiryController {
  createInquiry = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const inquiry = await inquiryService.createInquiry(req.user!._id.toString(), req.body);
      res.status(201).json({ success: true, data: inquiry });
    } catch (error) {
      next(error);
    }
  };

  getMyInquiries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const inquiries = await inquiryService.getMyInquiries(req.user!._id.toString());
      res.status(200).json({ success: true, data: inquiries });
    } catch (error) {
      next(error);
    }
  };

  getAssignedInquiries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const inquiries = await inquiryService.getAssignedInquiries(req.user!._id.toString());
      res.status(200).json({ success: true, data: inquiries });
    } catch (error) {
      next(error);
    }
  };

  updateInquiryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const inquiry = await inquiryService.updateInquiryStatus(
        req.params.id as string,
        req.user!._id.toString(),
        req.user!.role,
        req.body.status,
        req.body.statusNote
      );
      res.status(200).json({ success: true, data: inquiry });
    } catch (error) {
      next(error);
    }
  };
}
