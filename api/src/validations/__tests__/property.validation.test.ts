import { describe, expect, it } from 'vitest';
import { createPropertyValidation, propertyQueryValidation } from '../property.validation';

const basePayload = {
  title: 'Spacious family home',
  description: 'A lovely 3 bedroom home close to the city center.',
  price: 25000000,
  area: 1800,
  address: {
    street: '12 Galle Road',
    city: 'Colombo',
    state: 'Western',
    zipCode: '00300',
    country: 'Sri Lanka',
  },
  location: { type: 'Point', coordinates: [79.86, 6.93] },
};

describe('property validation', () => {
  it.each(['house', 'apartment', 'villa', 'land', 'commercial', 'office', 'warehouse', 'other'])(
    'accepts the "%s" property type',
    (type) => {
      const { error } = createPropertyValidation.validate({ ...basePayload, type });
      expect(error).toBeUndefined();
    }
  );

  it('rejects an unknown property type', () => {
    const { error } = createPropertyValidation.validate({ ...basePayload, type: 'castle' });
    expect(error).toBeDefined();
  });

  it.each(['for_sale', 'for_rent', 'pending', 'sold', 'rented', 'off_market'])(
    'accepts the "%s" status',
    (status) => {
      const { error } = createPropertyValidation.validate({ ...basePayload, type: 'house', status });
      expect(error).toBeUndefined();
    }
  );

  it('rejects a payload missing required address fields', () => {
    const { error } = createPropertyValidation.validate({
      ...basePayload,
      type: 'house',
      address: { street: '12 Galle Road' },
    });
    expect(error).toBeDefined();
  });

  it('allows filtering the search query by moderation status', () => {
    const { error } = propertyQueryValidation.validate({ moderationStatus: 'pending', page: 1, limit: 10 });
    expect(error).toBeUndefined();
  });

  it('rejects an invalid moderation status filter', () => {
    const { error } = propertyQueryValidation.validate({ moderationStatus: 'archived' });
    expect(error).toBeDefined();
  });
});
