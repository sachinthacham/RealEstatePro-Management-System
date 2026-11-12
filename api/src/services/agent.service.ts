import { Types } from 'mongoose';
import User from '../models/User.model';
import Property from '../models/property.model';
import Inquiry from '../models/inquiry.model';
import Visit from '../models/visit.model';
import { AppError } from '../utils/appError';

const PUBLIC_AGENT_FIELDS =
  'name email phone profileImage company licenseNumber bio experience specialty socialMedia createdAt';

export class AgentService {
  async listAgents(page = 1, limit = 20, search?: string) {
    const query: Record<string, unknown> = { role: 'agent', isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { specialty: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    const [agents, total] = await Promise.all([
      User.find(query).select(PUBLIC_AGENT_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
      User.countDocuments(query),
    ]);

    const agentIds = agents.map((agent) => agent._id);
    const listingCounts = await Property.aggregate([
      { $match: { agent: { $in: agentIds }, moderationStatus: 'approved' } },
      { $group: { _id: '$agent', count: { $sum: 1 } } },
    ]);
    const countByAgent = new Map(listingCounts.map((row) => [String(row._id), row.count]));

    return {
      agents: agents.map((agent) => ({
        ...agent.toObject(),
        activeListingsCount: countByAgent.get(String(agent._id)) ?? 0,
      })),
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    };
  }

  async getAgentProfile(agentId: string) {
    if (!Types.ObjectId.isValid(agentId)) throw new AppError('Invalid agent id', 400);

    const agent = await User.findOne({ _id: agentId, role: 'agent' }).select(PUBLIC_AGENT_FIELDS);
    if (!agent) throw new AppError('Agent not found', 404);

    const activeListingsCount = await Property.countDocuments({ agent: agentId, moderationStatus: 'approved' });

    return { ...agent.toObject(), activeListingsCount };
  }

  /** KPIs for an agent's own dashboard. Only the agent themself or an admin may request this. */
  async getAgentAnalytics(agentId: string) {
    if (!Types.ObjectId.isValid(agentId)) throw new AppError('Invalid agent id', 400);

    const agentObjectId = new Types.ObjectId(agentId);

    const [
      totalListings,
      activeListings,
      pendingListings,
      soldCount,
      rentedCount,
      viewsAgg,
      totalInquiries,
      newInquiries,
      scheduledViewings,
      favoritesAgg,
    ] = await Promise.all([
      Property.countDocuments({ agent: agentId }),
      Property.countDocuments({ agent: agentId, moderationStatus: 'approved' }),
      Property.countDocuments({ agent: agentId, moderationStatus: 'pending' }),
      Property.countDocuments({ agent: agentId, status: 'sold' }),
      Property.countDocuments({ agent: agentId, status: 'rented' }),
      Property.aggregate([{ $match: { agent: agentObjectId } }, { $group: { _id: null, total: { $sum: '$views' } } }]),
      Inquiry.countDocuments({ agent: agentId }),
      Inquiry.countDocuments({ agent: agentId, status: 'new' }),
      Visit.countDocuments({ agent: agentId, status: { $in: ['accepted', 'rescheduled'] } }),
      Property.aggregate([
        { $match: { agent: agentObjectId } },
        { $lookup: { from: 'users', localField: '_id', foreignField: 'favorites', as: 'favoritedBy' } },
        { $project: { count: { $size: '$favoritedBy' } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ]),
    ]);

    return {
      totalListings,
      activeListings,
      pendingListings,
      soldCount,
      rentedCount,
      totalViews: viewsAgg[0]?.total ?? 0,
      totalInquiries,
      newInquiries,
      scheduledViewings,
      totalFavorites: favoritesAgg[0]?.total ?? 0,
    };
  }
}
