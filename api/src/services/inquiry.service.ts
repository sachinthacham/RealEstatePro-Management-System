import { Types } from 'mongoose';
import Inquiry, { InquiryStatus } from '../models/inquiry.model';
import Property from '../models/property.model';
import { AppError } from '../utils/appError';
import { notifyUser } from './notification.service';

interface CreateInquiryInput {
  propertyId: string;
  message: string;
  contactEmail?: string;
  contactPhone?: string;
}

export class InquiryService {
  async createInquiry(requesterId: string, payload: CreateInquiryInput) {
    if (!Types.ObjectId.isValid(payload.propertyId)) {
      throw new AppError('Invalid property id', 400);
    }

    const property = await Property.findById(payload.propertyId);
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    const agentId = String((property as any).agent);
    if (agentId === requesterId) {
      throw new AppError('You cannot create an inquiry for your own property', 400);
    }

    const inquiry = await Inquiry.create({
      property: property._id,
      requester: requesterId,
      agent: (property as any).agent,
      message: payload.message,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      status: 'new',
    });

    notifyUser(agentId, {
      type: 'inquiry_received',
      title: 'New inquiry received',
      message: `You have a new inquiry about "${(property as any).title}".`,
      link: `/agent/leads?inquiryId=${inquiry._id}`,
    }).catch(() => undefined);

    return inquiry.populate([
      { path: 'property', select: 'title status price address images' },
      { path: 'requester', select: 'name email phone' },
      { path: 'agent', select: 'name email phone' },
    ]);
  }

  async getMyInquiries(requesterId: string) {
    return Inquiry.find({ requester: requesterId })
      .populate('property', 'title status price address images')
      .populate('agent', 'name email phone profileImage')
      .sort({ createdAt: -1 });
  }

  async getAssignedInquiries(agentId: string) {
    return Inquiry.find({ agent: agentId })
      .populate('property', 'title status price address images')
      .populate('requester', 'name email phone profileImage')
      .sort({ createdAt: -1 });
  }

  async updateInquiryStatus(
    inquiryId: string,
    actorId: string,
    actorRole: string,
    status: InquiryStatus,
    statusNote?: string
  ) {
    if (!Types.ObjectId.isValid(inquiryId)) {
      throw new AppError('Invalid inquiry id', 400);
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw new AppError('Inquiry not found', 404);
    }

    const canUpdate = actorRole === 'admin' || inquiry.agent.toString() === actorId;
    if (!canUpdate) {
      throw new AppError('You do not have permission to update this inquiry', 403);
    }

    inquiry.status = status;
    inquiry.statusNote = statusNote;
    await inquiry.save();

    notifyUser(inquiry.requester, {
      type: 'inquiry_response',
      title: 'Your inquiry was updated',
      message: `Your inquiry status changed to "${status}".${statusNote ? ` Note: ${statusNote}` : ''}`,
      link: `/user/inquiries`,
    }).catch(() => undefined);

    return inquiry.populate([
      { path: 'property', select: 'title status price address images' },
      { path: 'requester', select: 'name email phone' },
      { path: 'agent', select: 'name email phone' },
    ]);
  }
}
