export const PROPERTY_TYPES = [
  'house',
  'apartment',
  'villa',
  'land',
  'commercial',
  'office',
  'warehouse',
  'condo',
  'other',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

// `status` combines "listing type" (for_sale / for_rent) with lifecycle state
// (pending / sold / rented / off_market) in a single field, matching how the
// rest of the app already filters/badges properties by `status`.
export const PROPERTY_STATUSES = [
  'for_sale',
  'for_rent',
  'pending',
  'sold',
  'rented',
  'off_market',
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const FURNISHED_OPTIONS = ['unfurnished', 'semi_furnished', 'furnished'] as const;

export type FurnishedOption = (typeof FURNISHED_OPTIONS)[number];

export const MODERATION_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type ModerationStatus = (typeof MODERATION_STATUSES)[number];
