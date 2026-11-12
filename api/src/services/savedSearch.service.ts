import { Types } from 'mongoose';
import SavedSearch from '../models/savedSearch.model';
import Property from '../models/property.model';
import { AppError } from '../utils/appError';
import { notifyUser } from './notification.service';

interface SavedSearchInput {
  name: string;
  filters: Record<string, unknown>;
  isAlertEnabled?: boolean;
  frequency?: 'instant' | 'daily' | 'weekly';
}

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const buildPropertyFilter = (filters: Record<string, unknown>) => {
  const query: Record<string, unknown> = {};

  if (typeof filters.type === 'string') query.type = filters.type;
  if (typeof filters.status === 'string') query.status = filters.status;

  const minPrice = toNumber(filters.minPrice);
  const maxPrice = toNumber(filters.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) (query.price as Record<string, number>).$gte = minPrice;
    if (maxPrice !== undefined) (query.price as Record<string, number>).$lte = maxPrice;
  }

  const bedrooms = toNumber(filters.bedrooms);
  const bathrooms = toNumber(filters.bathrooms);
  if (bedrooms !== undefined) query.bedrooms = { $gte: bedrooms };
  if (bathrooms !== undefined) query.bathrooms = { $gte: bathrooms };

  if (typeof filters.city === 'string' && filters.city.trim()) {
    query['address.city'] = { $regex: filters.city.trim(), $options: 'i' };
  }
  if (typeof filters.search === 'string' && filters.search.trim()) {
    query.$or = [
      { title: { $regex: filters.search.trim(), $options: 'i' } },
      { description: { $regex: filters.search.trim(), $options: 'i' } },
      { 'address.city': { $regex: filters.search.trim(), $options: 'i' } },
    ];
  }

  return query;
};

export class SavedSearchService {
  async create(userId: string, payload: SavedSearchInput) {
    const exists = await SavedSearch.findOne({ user: userId, name: payload.name });
    if (exists) {
      throw new AppError('Saved search name already exists', 409);
    }

    return SavedSearch.create({
      user: userId,
      name: payload.name,
      filters: payload.filters,
      isAlertEnabled: payload.isAlertEnabled ?? true,
      frequency: payload.frequency ?? 'daily',
    });
  }

  async list(userId: string) {
    return SavedSearch.find({ user: userId, isActive: true }).sort({ createdAt: -1 });
  }

  async update(userId: string, id: string, payload: Partial<SavedSearchInput> & { isActive?: boolean }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid saved search id', 400);
    }

    const savedSearch = await SavedSearch.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!savedSearch) {
      throw new AppError('Saved search not found', 404);
    }

    return savedSearch;
  }

  async remove(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid saved search id', 400);
    }

    const savedSearch = await SavedSearch.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!savedSearch) {
      throw new AppError('Saved search not found', 404);
    }
  }

  async run(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid saved search id', 400);
    }

    const savedSearch = await SavedSearch.findOne({ _id: id, user: userId, isActive: true });
    if (!savedSearch) {
      throw new AppError('Saved search not found', 404);
    }

    const filter = buildPropertyFilter(savedSearch.filters as Record<string, unknown>);
    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('agent', 'name email profileImage');

    savedSearch.lastRunAt = new Date();
    savedSearch.lastResultCount = properties.length;
    if (savedSearch.isAlertEnabled) {
      savedSearch.lastAlertAt = new Date();
    }
    await savedSearch.save();

    return {
      savedSearch,
      matches: properties,
      count: properties.length,
    };
  }
}

/**
 * Notify users with an "instant" alert-enabled saved search when a newly
 * approved property matches their filters. Daily/weekly digests would need a
 * scheduled job and are out of scope for this pass.
 */
export async function checkSavedSearchesForProperty(property: { _id: Types.ObjectId | string; title: string }) {
  const candidates = await SavedSearch.find({
    isActive: true,
    isAlertEnabled: true,
    frequency: 'instant',
  }).limit(500);

  await Promise.all(
    candidates.map(async (savedSearch) => {
      const filter = buildPropertyFilter(savedSearch.filters as Record<string, unknown>);
      const matches = await Property.exists({ ...filter, _id: property._id, moderationStatus: 'approved' });
      if (!matches) return;

      savedSearch.lastAlertAt = new Date();
      await savedSearch.save();

      await notifyUser(savedSearch.user, {
        type: 'saved_search_match',
        title: 'New match for your saved search',
        message: `"${property.title}" matches your saved search "${savedSearch.name}".`,
        link: `/properties/${property._id}`,
      });
    })
  );
}
