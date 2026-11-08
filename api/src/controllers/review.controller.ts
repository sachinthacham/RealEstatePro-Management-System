import { Request, Response, NextFunction } from 'express';
import reviewService from '../services/review.service';

// extend Request type to include user (if not already done globally)
interface AuthRequest extends Request {
  user?: any;
}

export const addReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    
    const propertyId = req.params.id as string;

    // 2. Get User ID from auth middleware
    const userId = req.user._id || req.user.id;

    const review = await reviewService.createReview(propertyId, userId, req.body);

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    // Handle Duplicate Key Error (MongoDB Code 11000)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this property',
      });
    }
    next(error);
  }
};

export const getPropertyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyId = req.params.id as string;
    const reviews = await reviewService.getReviewsByProperty(propertyId);

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const review = await reviewService.updateReview(
      req.params.reviewId as string,
      req.user._id || req.user.id,
      req.user.role,
      req.body
    );

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await reviewService.deleteReview(
      req.params.reviewId as string,
      req.user._id || req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const reportReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await reviewService.reportReview(req.params.reviewId as string);
    res.status(200).json({
      success: true,
      message: 'Review reported for moderation',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};