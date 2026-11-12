import Joi from 'joi';
import { PROPERTY_TYPES, PROPERTY_STATUSES, FURNISHED_OPTIONS } from '../constants/property';

const addressSchema = Joi.object({
  street: Joi.string().required(),
  city: Joi.string().required(),
  district: Joi.string().allow('', null),
  state: Joi.string().required(),
  zipCode: Joi.string().required(),
  country: Joi.string().required(),
});

const addressUpdateSchema = Joi.object({
  street: Joi.string(),
  city: Joi.string(),
  district: Joi.string().allow('', null),
  state: Joi.string(),
  zipCode: Joi.string(),
  country: Joi.string(),
});

const locationSchema = Joi.object({
  type: Joi.string().valid('Point').default('Point'),
  coordinates: Joi.array().items(Joi.number()).length(2).required(),
});

export const createPropertyValidation = Joi.object({
  title: Joi.string().required().min(5).max(200),
  description: Joi.string().required().min(10).max(5000),
  type: Joi.string().valid(...PROPERTY_TYPES).required(),
  status: Joi.string().valid(...PROPERTY_STATUSES).default('for_sale'),
  price: Joi.number().required().min(0),
  currency: Joi.string().max(10).default('LKR'),
  bedrooms: Joi.number().min(0).default(0),
  bathrooms: Joi.number().min(0).default(0),
  area: Joi.number().required().min(0),
  landArea: Joi.number().min(0).allow(null),
  parking: Joi.number().min(0).default(0),
  furnished: Joi.string().valid(...FURNISHED_OPTIONS).default('unfurnished'),
  yearBuilt: Joi.number().min(1800).max(new Date().getFullYear()).allow(null),
  address: addressSchema.required(),
  location: locationSchema.required(),
  amenities: Joi.array().items(Joi.string()),
  images: Joi.array().items(Joi.string()),
  videoUrl: Joi.string().uri().allow('', null),
  virtualTourUrl: Joi.string().uri().allow('', null),
  whatsappNumber: Joi.string().allow('', null),
  emailContact: Joi.string().email().allow('', null),
});

export const updatePropertyValidation = Joi.object({
  title: Joi.string().min(5).max(200),
  description: Joi.string().min(10).max(5000),
  type: Joi.string().valid(...PROPERTY_TYPES),
  status: Joi.string().valid(...PROPERTY_STATUSES),
  price: Joi.number().min(0),
  currency: Joi.string().max(10),
  bedrooms: Joi.number().min(0),
  bathrooms: Joi.number().min(0),
  area: Joi.number().min(0),
  landArea: Joi.number().min(0).allow(null),
  parking: Joi.number().min(0),
  furnished: Joi.string().valid(...FURNISHED_OPTIONS),
  yearBuilt: Joi.number().min(1800).max(new Date().getFullYear()).allow(null),
  address: addressUpdateSchema,
  location: locationSchema,
  amenities: Joi.array().items(Joi.string()),
  images: Joi.array().items(Joi.string()),
  videoUrl: Joi.string().uri().allow('', null),
  virtualTourUrl: Joi.string().uri().allow('', null),
  whatsappNumber: Joi.string().allow('', null),
  emailContact: Joi.string().email().allow('', null),
});

export const propertyQueryValidation = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  type: Joi.string().valid('all', ...PROPERTY_TYPES),
  status: Joi.string().valid('all', ...PROPERTY_STATUSES),
  moderationStatus: Joi.string().valid('all', 'pending', 'approved', 'rejected'),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  bedrooms: Joi.alternatives(Joi.number().min(0), Joi.string().valid('all')),
  bathrooms: Joi.alternatives(Joi.number().min(0), Joi.string().valid('all')),
  minArea: Joi.number().min(0),
  maxArea: Joi.number().min(0),
  furnished: Joi.string().valid('all', ...FURNISHED_OPTIONS),
  parking: Joi.alternatives(Joi.boolean(), Joi.string()),
  amenities: Joi.alternatives(Joi.string(), Joi.array().items(Joi.string())),
  city: Joi.string(),
  state: Joi.string(),
  agent: Joi.string(),
  search: Joi.string().allow(''),
  sortBy: Joi.string().valid('price', 'createdAt', 'area', 'bedrooms', 'bathrooms', 'views'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});
