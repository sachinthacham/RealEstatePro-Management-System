import Property from '../models/property.model';
import { IPropertyQuery } from '../interfaces/IProperty';
import { AppError } from '../utils/appError';
import { Types } from 'mongoose';

export interface PropertyViewer {
  id: string;
  role: 'user' | 'agent' | 'admin';
}

export class PropertyService {
  /**
   * Create a new property listing
   */
  async createProperty(data: any) {
    return await Property.create(data);
  }

  /**
   * Get properties with advanced filtering, search, and pagination
   */
  // src/services/property.service.ts (or wherever your service lives)


getProperties = async (query: any, viewer?: PropertyViewer) => {
  const {
    page = 1,
    limit = 10,
    agent,
    type,
    status,
    moderationStatus,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    minArea,
    maxArea,
    furnished,
    parking,
    amenities,
    city,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter: any = {};

  if (type && type !== 'all') {
    filter.type = type;
  }

  if (agent && Types.ObjectId.isValid(agent as string)) {
    filter.agent = new Types.ObjectId(agent as string);
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  // Moderation visibility: the public only ever sees approved listings.
  // An admin, or an agent looking at their own listings, may see every
  // moderation state (optionally narrowed further via ?moderationStatus=).
  const isOwner = !!(viewer && agent && String(viewer.id) === String(agent));
  const isAdmin = viewer?.role === 'admin';
  if (isAdmin || isOwner) {
    if (moderationStatus && moderationStatus !== 'all') {
      filter.moderationStatus = moderationStatus;
    }
  } else {
    filter.moderationStatus = 'approved';
  }

  if (bedrooms && bedrooms !== 'all') {
    filter.bedrooms = { $gte: Number(bedrooms) };
  }

  if (bathrooms && bathrooms !== 'all') {
    filter.bathrooms = { $gte: Number(bathrooms) };
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (minArea || maxArea) {
    filter.area = {};
    if (minArea) filter.area.$gte = Number(minArea);
    if (maxArea) filter.area.$lte = Number(maxArea);
  }

  if (furnished && furnished !== 'all') {
    filter.furnished = furnished;
  }

  if (parking === true || parking === 'true') {
    filter.parking = { $gt: 0 };
  }

  if (amenities) {
    const amenityList = Array.isArray(amenities) ? amenities : [amenities];
    if (amenityList.length) filter.amenities = { $all: amenityList };
  }

  // City Search (Case-insensitive & Partial Match)
  // Looks inside nested address object: 'address.city'
  if (city) {
    filter['address.city'] = { $regex: city, $options: 'i' };
  }

  // Global Text Search (Optional: if you have a main search bar)
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } },
      { propertyReference: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination & Sorting Setup
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  // Dynamic Sort object
  const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

  // Execute Queries in Parallel for speed
  const [properties, total] = await Promise.all([
    Property.find(filter)
      .populate('agent', 'name email profileImage') // ✅ Populate agent details
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .lean(), // lean() makes it a plain JS object (faster)
    Property.countDocuments(filter),
  ]);

  return {
    properties,
    total,
    page: pageNumber,
    totalPages: Math.ceil(total / limitNumber),
  };
};



  /**
   * Fetch a single property by ID
   */
  async getPropertyById(id: string, viewer?: PropertyViewer) {
    if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid Property ID', 400);

    const property = await Property.findById(id)
      .populate('agent', 'name email phone profileImage bio experience company')
      .populate('createdBy', 'name email');

    if (!property) throw new AppError('Property not found', 404);

    const moderationStatus = (property as any).moderationStatus;
    const isOwner = !!(viewer && String((property as any).agent?._id ?? (property as any).agent) === String(viewer.id));
    const isAdmin = viewer?.role === 'admin';

    if (moderationStatus !== 'approved' && !isOwner && !isAdmin) {
      throw new AppError('Property is not publicly available', 404);
    }
    return property;
  }

  /** Increment the view counter for a property (fire-and-forget by callers). */
  async incrementViews(id: string) {
    if (!Types.ObjectId.isValid(id)) return;
    await Property.findByIdAndUpdate(id, { $inc: { views: 1 } });
  }

  /**
   * Get all properties listed by a specific agent
   */
  async getPropertiesByAgent(agentId: string, query: IPropertyQuery, viewer?: PropertyViewer) {
    if (!Types.ObjectId.isValid(agentId)) throw new AppError('Invalid Agent ID', 400);

    // Add agent to the query and reuse the main getProperties logic
    const modifiedQuery = { ...query, agent: agentId };
    return this.getProperties(modifiedQuery, viewer);
  }

  /** Update property with ownership check */
  async updateProperty(id: string, data: any, userId: string, role: string) {
    if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid Property ID', 400);
    const property = await Property.findById(id);
    if (!property) throw new AppError('Property not found', 404);

    // Standard check: only the owner (agent) or an admin can edit
    if (String((property as any).agent) !== userId && role !== 'admin') {
      throw new AppError('You do not have permission to update this property', 403);
    }

    const update: any = { ...data };
    // An agent editing a previously-rejected listing resubmits it for review.
    // Admins may still set moderationStatus explicitly (e.g. via the moderation endpoint).
    if (role !== 'admin' && (property as any).moderationStatus === 'rejected') {
      update.moderationStatus = 'pending';
      update.moderationNotes = '';
    } else if (role !== 'admin') {
      delete update.moderationStatus;
      delete update.moderationNotes;
    }

    return await Property.findByIdAndUpdate(id, { $set: update }, {
      new: true,
      runValidators: true
    }).populate('agent', 'name email phone');
  }

  /**
   * Delete property with ownership check
   */
  async deleteProperty(id: string, userId: string, role: string) {
    if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid Property ID', 400);
    const property = await Property.findById(id);
    if (!property) throw new AppError('Property not found', 404);

    if (String((property as any).agent) !== userId && role !== 'admin') {
      throw new AppError('You do not have permission to delete this property', 403);
    }

    await property.deleteOne();
    return true;
  }

  /**
   * Geospatial search for properties within a specific radius
   */
  async getNearbyProperties(lng: number, lat: number, dist: number = 10000, limit: number = 50) {
    return await Property.find({
      moderationStatus: 'approved',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: Number(dist),
        },
      },
    })
      .limit(Math.min(Number(limit) || 50, 100))
      .populate('agent', 'name email phone profileImage');
  }
}