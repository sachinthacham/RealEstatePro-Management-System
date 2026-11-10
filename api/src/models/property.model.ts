import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';
import { PROPERTY_TYPES, PROPERTY_STATUSES, FURNISHED_OPTIONS, MODERATION_STATUSES } from '../constants/property';

// 8 chars from a 32-symbol alphabet (~10^12 combinations) — collisions are
// negligible, and the unique index rejects one if it ever happens.
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generatePropertyReference(): string {
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (const byte of bytes) suffix += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  return `PROP-${suffix}`;
}

const PropertySchema: Schema = new Schema(
  {
    // A short, human-friendly reference shown to users/agents (e.g. PROP-7K2M9QXA).
    // A schema default (not a save hook) so it's also set by insertMany.
    propertyReference: { type: String, unique: true, default: generatePropertyReference },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: PROPERTY_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: PROPERTY_STATUSES,
      default: 'for_sale',
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR', uppercase: true, trim: true },
    bedrooms: { type: Number, default: 0, min: 0 },
    bathrooms: { type: Number, default: 0, min: 0 },
    // Floor area of the built structure, in square feet.
    area: { type: Number, required: true, min: 0 },
    // Land/plot area, in perches, for houses/villas/land listings. Optional.
    landArea: { type: Number, min: 0 },
    parking: { type: Number, default: 0, min: 0 },
    furnished: { type: String, enum: FURNISHED_OPTIONS, default: 'unfurnished' },
    yearBuilt: Number,
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true, index: true },
      district: { type: String, trim: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    amenities: [String],
    // First image in the array is treated as the cover image; array order
    // is the display order used by the gallery.
    images: [String],
    videoUrl: { type: String, default: '' },
    virtualTourUrl: { type: String, default: '' },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
    // Draft/approval workflow: agents submit a listing, an admin approves or
    // rejects it (with a reason recorded in moderationNotes) before it is
    // publicly visible in search results.
    moderationStatus: {
      type: String,
      enum: MODERATION_STATUSES,
      default: 'pending',
    },
    moderationNotes: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    emailContact: { type: String, default: '' },
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

PropertySchema.index({ location: '2dsphere' });
PropertySchema.index({ title: 'text', description: 'text' });
PropertySchema.index({ type: 1 });
PropertySchema.index({ status: 1 });
PropertySchema.index({ moderationStatus: 1 });
PropertySchema.index({ price: 1 });
PropertySchema.index({ agent: 1 });
PropertySchema.index({ createdAt: -1 });

export default mongoose.model('Property', PropertySchema);
