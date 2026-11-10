import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SavedSearchService } from '../services/savedSearch.service';

const savedSearchService = new SavedSearchService();

export class SavedSearchController {
  createSavedSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const savedSearch = await savedSearchService.create(req.user!._id.toString(), req.body);
      res.status(201).json({ success: true, data: savedSearch });
    } catch (error) {
      next(error);
    }
  };

  listSavedSearches = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const savedSearches = await savedSearchService.list(req.user!._id.toString());
      res.status(200).json({ success: true, data: savedSearches });
    } catch (error) {
      next(error);
    }
  };

  updateSavedSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const savedSearch = await savedSearchService.update(
        req.user!._id.toString(),
        req.params.id as string,
        req.body
      );
      res.status(200).json({ success: true, data: savedSearch });
    } catch (error) {
      next(error);
    }
  };

  deleteSavedSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await savedSearchService.remove(req.user!._id.toString(), req.params.id as string);
      res.status(200).json({ success: true, message: 'Saved search removed successfully' });
    } catch (error) {
      next(error);
    }
  };

  runSavedSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await savedSearchService.run(req.user!._id.toString(), req.params.id as string);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
