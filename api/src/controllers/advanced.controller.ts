import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import ChatThread from '../models/chatThread.model';
import RiskFlag from '../models/riskFlag.model';
import Property from '../models/property.model';
import User from '../models/User.model';

export class AdvancedController {
  getNotificationPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user!._id).select('notificationPreferences');
      res.status(200).json({
        success: true,
        data: user?.notificationPreferences,
      });
    } catch (error) {
      next(error);
    }
  };

  updateNotificationPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.user!._id,
        { $set: { notificationPreferences: { ...req.user!.notificationPreferences, ...req.body } } },
        { new: true, runValidators: true }
      ).select('notificationPreferences');

      res.status(200).json({
        success: true,
        message: 'Notification preferences updated',
        data: user?.notificationPreferences,
      });
    } catch (error) {
      next(error);
    }
  };

  listThreads = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const threads = await ChatThread.find({ participants: req.user!._id })
        .populate('participants', 'name email role profileImage')
        .populate('property', 'title status price address images')
        .sort({ updatedAt: -1 });

      res.status(200).json({ success: true, data: threads });
    } catch (error) {
      next(error);
    }
  };

  createThread = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const participants = [...new Set([req.user!._id.toString(), ...(req.body.participants ?? [])])];
      const thread = await ChatThread.create({
        participants,
        property: req.body.propertyId,
        lastMessage: req.body.initialMessage ?? '',
        lastMessageAt: req.body.initialMessage ? new Date() : undefined,
      });

      res.status(201).json({ success: true, data: thread });
    } catch (error) {
      next(error);
    }
  };

  escalateThread = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const thread = await ChatThread.findByIdAndUpdate(
        req.params.threadId,
        { $set: { isEscalated: true } },
        { new: true }
      );
      res.status(200).json({ success: true, data: thread });
    } catch (error) {
      next(error);
    }
  };

  runRiskScan = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const suspiciousProperties = await Property.find({
        $or: [{ price: { $lte: 1 } }, { title: { $regex: 'urgent|quick sale', $options: 'i' } }],
      }).select('_id');

      const createdFlags = await Promise.all(
        suspiciousProperties.slice(0, 20).map((property) =>
          RiskFlag.create({
            targetType: 'property',
            targetId: property._id,
            score: 70,
            reasons: ['price anomaly or suspicious title'],
            status: 'open',
          })
        )
      );

      res.status(200).json({
        success: true,
        message: 'Risk scan completed',
        data: { flagsCreated: createdFlags.length },
      });
    } catch (error) {
      next(error);
    }
  };

  getRiskFlags = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const flags = await RiskFlag.find({}).sort({ createdAt: -1 }).limit(100);
      res.status(200).json({ success: true, data: flags });
    } catch (error) {
      next(error);
    }
  };

  getGeoRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { lat, lng } = req.query;
      const latitude = Number(lat);
      const longitude = Number(lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ success: false, message: 'lat and lng are required' });
      }

      const properties = await Property.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: 15000,
          },
        },
        moderationStatus: 'approved',
      })
        .sort({ averageRating: -1, createdAt: -1 })
        .limit(12);

      res.status(200).json({ success: true, data: properties });
    } catch (error) {
      next(error);
    }
  };
}
