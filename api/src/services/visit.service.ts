import { Types } from 'mongoose';
import Visit, { VisitStatus } from '../models/visit.model';
import Property from '../models/property.model';
import { AppError } from '../utils/appError';
import { notifyUser } from './notification.service';

interface CreateVisitInput {
  propertyId: string;
  requestedStartAt: Date;
  requestedEndAt: Date;
  requesterNote?: string;
}

interface UpdateVisitStatusInput {
  status: VisitStatus;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  agentNote?: string;
  decisionReason?: string;
}

export class VisitService {
  async createVisit(requesterId: string, payload: CreateVisitInput) {
    if (!Types.ObjectId.isValid(payload.propertyId)) {
      throw new AppError('Invalid property id', 400);
    }
    const property = await Property.findById(payload.propertyId);
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    if (String((property as any).agent) === requesterId) {
      throw new AppError('You cannot request a visit for your own property', 400);
    }

    if (new Date(payload.requestedStartAt) <= new Date()) {
      throw new AppError('Visit start time must be in the future', 400);
    }

    const visit = await Visit.create({
      property: property._id,
      requester: requesterId,
      agent: (property as any).agent,
      requestedStartAt: payload.requestedStartAt,
      requestedEndAt: payload.requestedEndAt,
      requesterNote: payload.requesterNote,
      status: 'pending',
    });

    notifyUser((property as any).agent, {
      type: 'visit_requested',
      title: 'New viewing request',
      message: `A viewing was requested for "${(property as any).title}".`,
      link: `/agent/leads?visitId=${visit._id}`,
    }).catch(() => undefined);

    return visit.populate([
      { path: 'property', select: 'title status price address images' },
      { path: 'requester', select: 'name email phone' },
      { path: 'agent', select: 'name email phone' },
    ]);
  }

  async getMyVisits(userId: string) {
    return Visit.find({ requester: userId })
      .populate('property', 'title status price address images')
      .populate('agent', 'name email phone profileImage')
      .sort({ createdAt: -1 });
  }

  async getAssignedVisits(agentId: string) {
    return Visit.find({ agent: agentId })
      .populate('property', 'title status price address images')
      .populate('requester', 'name email phone profileImage')
      .sort({ createdAt: -1 });
  }

  async updateVisitStatus(
    visitId: string,
    actorId: string,
    actorRole: string,
    payload: UpdateVisitStatusInput
  ) {
    if (!Types.ObjectId.isValid(visitId)) {
      throw new AppError('Invalid visit id', 400);
    }

    const visit = await Visit.findById(visitId);
    if (!visit) {
      throw new AppError('Visit not found', 404);
    }

    const isAdmin = actorRole === 'admin';
    const isAgent = visit.agent.toString() === actorId;
    const isRequester = visit.requester.toString() === actorId;

    if (!isAdmin && !isAgent && !isRequester) {
      throw new AppError('You do not have permission to update this visit', 403);
    }

    // Requesters can only cancel their own visits.
    if (isRequester && !isAdmin && payload.status !== 'cancelled') {
      throw new AppError('You can only cancel your own visit request', 403);
    }

    // Only agent/admin can accept/reject/reschedule/complete.
    if (!isAdmin && !isAgent && ['accepted', 'rejected', 'rescheduled', 'completed'].includes(payload.status)) {
      throw new AppError('Only the assigned agent can perform this action', 403);
    }

    if (payload.status === 'rescheduled' || payload.status === 'accepted') {
      const startAt = payload.scheduledStartAt ?? visit.requestedStartAt;
      const endAt = payload.scheduledEndAt ?? visit.requestedEndAt;
      if (startAt >= endAt) {
        throw new AppError('Scheduled end time must be greater than start time', 400);
      }

      const hasConflict = await Visit.exists({
        _id: { $ne: visit._id },
        agent: visit.agent,
        status: { $in: ['accepted', 'rescheduled'] },
        scheduledStartAt: { $lt: endAt },
        scheduledEndAt: { $gt: startAt },
      });

      if (hasConflict) {
        throw new AppError('Agent already has another visit in this time range', 409);
      }

      visit.scheduledStartAt = startAt;
      visit.scheduledEndAt = endAt;
    }

    visit.status = payload.status;
    if (payload.agentNote !== undefined) {
      visit.agentNote = payload.agentNote;
    }
    if (payload.decisionReason !== undefined) {
      visit.decisionReason = payload.decisionReason;
    }
    if (payload.status === 'cancelled') {
      visit.cancelledBy = new Types.ObjectId(actorId);
    }

    await visit.save();

    // Notify whichever side didn't just make the change.
    const notifyTargetId = actorId === visit.requester.toString() ? visit.agent : visit.requester;
    notifyUser(notifyTargetId, {
      type: 'visit_status_changed',
      title: 'Viewing request updated',
      message: `Your property viewing is now "${payload.status}".${payload.decisionReason ? ` Reason: ${payload.decisionReason}` : ''}`,
      link: `/user/appointments`,
    }).catch(() => undefined);

    return visit.populate([
      { path: 'property', select: 'title status price address images' },
      { path: 'requester', select: 'name email phone' },
      { path: 'agent', select: 'name email phone' },
      { path: 'cancelledBy', select: 'name email role' },
    ]);
  }
}
