import { PropertyType, PropertyStatus, FurnishedOption, ModerationStatus } from '../constants/property';

export interface IProperty {
    _id: string;
    propertyReference: string;
    title: string;
    description: string;
    type: PropertyType;
    status: PropertyStatus;
    price: number;
    currency: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    landArea?: number;
    parking: number;
    furnished: FurnishedOption;
    yearBuilt?: number;
    address: {
      street: string;
      city: string;
      district?: string;
      state: string;
      zipCode: string;
      country: string;
    };
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    amenities: string[];
    images: string[];
    videoUrl?: string;
    virtualTourUrl?: string;
    views: number;
    moderationStatus: ModerationStatus;
    moderationNotes?: string;
    agent: string; // Populated or ID
    createdBy: any;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface IPropertyQuery {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    minArea?: number;
    maxArea?: number;
    furnished?: string;
    parking?: boolean;
    amenities?: string | string[];
    city?: string;
    state?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    moderationStatus?: string;
  }
  
  export interface IPropertyResponse {
    success: boolean;
    message?: string;
    data?: any;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }