import { Types } from 'mongoose';
import Report, { ReportStatus, ReportTargetType } from '../models/report.model';
import Property from '../models/property.model';
import User from '../models/User.model';
import Inquiry from '../models/inquiry.model';
import Visit from '../models/visit.model';
import { AppError } from '../utils/appError';
import { notifyUser } from './notification.service';
import { checkSavedSearchesForProperty } from './savedSearch.service';

interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason:
    | 'spam'
    | 'fraud'
    | 'misleading_information'
    | 'offensive_content'
    | 'duplicate_listing'
    | 'other';
  description?: string;
}

export class AdminService {
  async createReport(reporterId: string, payload: CreateReportInput) {
    if (!Types.ObjectId.isValid(payload.targetId)) {
      throw new AppError('Invalid target id', 400);
    }

    if (payload.targetType === 'property') {
      const property = await Property.findById(payload.targetId);
      if (!property) throw new AppError('Target property not found', 404);
    } else if (payload.targetType === 'user') {
      const user = await User.findById(payload.targetId);
      if (!user) throw new AppError('Target user not found', 404);
    }

    return Report.create({
      reporter: reporterId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      reason: payload.reason,
      description: payload.description,
      status: 'open',
    });
  }

  async listReports(status?: ReportStatus, page = 1, limit = 20) {
    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporter', 'name email role')
        .populate('reviewedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Report.countDocuments(query),
    ]);

    return {
      reports,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    };
  }

  async updateReportStatus(reportId: string, adminId: string, status: ReportStatus, resolutionNote?: string) {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new AppError('Invalid report id', 400);
    }

    const report = await Report.findById(reportId);
    if (!report) throw new AppError('Report not found', 404);

    report.status = status;
    report.resolutionNote = resolutionNote;
    report.reviewedBy = new Types.ObjectId(adminId);
    report.reviewedAt = new Date();
    await report.save();

    return report.populate([
      { path: 'reporter', select: 'name email role' },
      { path: 'reviewedBy', select: 'name email role' },
    ]);
  }

  async getDashboardSummary() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalAgents,
      totalProperties,
      totalInquiries,
      totalVisits,
      openReports,
      recentProperties,
      recentInquiries,
      visitsByStatus,
      inquiriesByStatus,
      reportsByStatus,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'agent' }),
      Property.countDocuments({}),
      Inquiry.countDocuments({}),
      Visit.countDocuments({}),
      Report.countDocuments({ status: { $in: ['open', 'in_review'] } }),
      Property.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Inquiry.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Visit.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Inquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return {
      totals: {
        users: totalUsers,
        agents: totalAgents,
        properties: totalProperties,
        inquiries: totalInquiries,
        visits: totalVisits,
        openReports,
      },
      last30Days: {
        newProperties: recentProperties,
        newInquiries: recentInquiries,
      },
      breakdowns: {
        visitsByStatus,
        inquiriesByStatus,
        reportsByStatus,
      },
    };
  }

  async listUsers(page = 1, limit = 20, role?: 'user' | 'agent' | 'admin') {
    const query: Record<string, unknown> = {};
    if (role) query.role = role;

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email role isActive isEmailVerified createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      User.countDocuments(query),
    ]);

    return {
      users,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid user id', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select('name email role isActive isEmailVerified createdAt lastLogin');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async listProperties(page = 1, limit = 20, moderationStatus?: 'pending' | 'approved' | 'rejected') {
    const query: Record<string, unknown> = {};
    if (moderationStatus) query.moderationStatus = moderationStatus;

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('agent', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Property.countDocuments(query),
    ]);

    return {
      properties,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    };
  }

  async moderateProperty(
    propertyId: string,
    moderationStatus: 'pending' | 'approved' | 'rejected',
    moderationNotes?: string
  ) {
    if (!Types.ObjectId.isValid(propertyId)) {
      throw new AppError('Invalid property id', 400);
    }

    const property = await Property.findByIdAndUpdate(
      propertyId,
      { $set: { moderationStatus, moderationNotes: moderationNotes ?? '' } },
      { new: true, runValidators: true }
    ).populate('agent', 'name email role');

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    const agentId = (property as any).agent?._id ?? (property as any).agent;
    if (moderationStatus === 'approved') {
      notifyUser(agentId, {
        type: 'property_approved',
        title: 'Listing approved',
        message: `Your listing "${property.title}" is now live.`,
        link: `/properties/${property._id}`,
      }).catch(() => undefined);
      checkSavedSearchesForProperty({ _id: (property as any)._id, title: (property as any).title }).catch(() => undefined);
    } else if (moderationStatus === 'rejected') {
      notifyUser(agentId, {
        type: 'property_rejected',
        title: 'Listing rejected',
        message: `Your listing "${property.title}" was rejected.${moderationNotes ? ` Reason: ${moderationNotes}` : ''}`,
        link: `/user/listings/${property._id}`,
      }).catch(() => undefined);
    }

    return property;
  }
}
