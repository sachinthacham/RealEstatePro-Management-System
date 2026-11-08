import {Response, NextFunction } from 'express';
import userService from '../services/favourites.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const toggleFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const propertyId = req.params.propertyId as string;
    const result = await userService.toggleFavorite(req.user!._id, propertyId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getFavorites = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const favorites = await userService.getFavorites(req.user!._id);
    res.status(200).json({ success: true, data: favorites });
  } catch (error) {
    next(error);
  }
};

export default { toggleFavorite, getFavorites };