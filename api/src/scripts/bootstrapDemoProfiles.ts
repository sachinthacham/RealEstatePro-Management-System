import mongoose, { Types } from 'mongoose';
import { MONGO_URI } from '../config';
import User, { IUser } from '../models/User.model';
import Property from '../models/property.model';
import Review from '../models/review.model';
import Inquiry from '../models/inquiry.model';
import Visit from '../models/visit.model';
import Report from '../models/report.model';
import SavedSearch from '../models/savedSearch.model';
import ChatThread from '../models/chatThread.model';

const DEMO_USER = {
  email: 'demo.user@realestate.lk',
  password: 'DemoUser@123',
  name: 'Nimali Perera',
};

const DEMO_ADMIN = {
  email: 'demo.admin@realestate.lk',
  password: 'DemoAdmin@123',
  name: 'Kasun Wijesinghe',
};

const DEMO_BUYER = {
  email: 'demo.buyer@realestate.lk',
  password: 'DemoBuyer@123',
  name: 'Tharushi Fernando',
};

const sriLankaImagePool = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1400&q=80',
];

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function ensureUser(params: {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'agent' | 'admin';
}): Promise<IUser> {
  let user = await User.findOne({ email: params.email }).select('+password');
  if (!user) {
    user = new User({
      email: params.email,
      password: params.password,
      name: params.name,
      role: params.role,
    });
  } else {
    user.name = params.name;
    user.role = params.role;
    user.password = params.password;
  }

  user.isActive = true;
  user.isEmailVerified = true;
  user.phone = '+94771234567';
  user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(params.name)}&background=0D8ABC&color=fff`;
  user.subscription = {
    plan: params.role === 'admin' ? 'BUSINESS' : 'PREMIUM',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    status: 'active',
    paymentId: `demo_${params.role}_sub`,
  } as any;
  user.company = params.role === 'agent' ? 'Nimali Prime Estates' : 'RealEstate HQ';
  user.experience = params.role === 'agent' ? 7 : 10;
  user.bio =
    params.role === 'agent'
      ? 'Specialized in Colombo, Negombo, and Kandy residential and investment properties.'
      : 'Platform administrator for moderation and operations.';
  user.specialty = params.role === 'agent' ? ['residential', 'investment'] : ['residential'];

  await user.save();
  return user;
}

async function ensureDemoAds(agentId: Types.ObjectId, createdById: Types.ObjectId) {
  await Property.deleteMany({ agent: agentId, title: { $regex: '^Demo Listing' } });

  const ads = [
    {
      title: 'Demo Listing - Luxury Apartment in Colombo 03',
      description:
        'Premium 3-bedroom apartment with sea breeze, secure parking, and easy access to schools and hospitals.',
      type: 'apartment',
      status: 'for_sale',
      price: 72000000,
      bedrooms: 3,
      bathrooms: 2,
      area: 1850,
      yearBuilt: 2018,
      address: {
        street: '54 Marine Drive',
        city: 'Colombo',
        state: 'Western Province',
        zipCode: '00300',
        country: 'Sri Lanka',
      },
      location: { type: 'Point', coordinates: [79.8573, 6.8961] },
    },
    {
      title: 'Demo Listing - Family House in Kandy',
      description:
        'Spacious family home with private garden and mountain view, close to Peradeniya and city amenities.',
      type: 'house',
      status: 'for_sale',
      price: 48000000,
      bedrooms: 4,
      bathrooms: 3,
      area: 3200,
      yearBuilt: 2012,
      address: {
        street: '21 Temple Road',
        city: 'Kandy',
        state: 'Central Province',
        zipCode: '20000',
        country: 'Sri Lanka',
      },
      location: { type: 'Point', coordinates: [80.6337, 7.2906] },
    },
    {
      title: 'Demo Listing - Rental Condo in Negombo',
      description:
        'Fully furnished condo for professionals, 10 minutes to beach and easy airport connectivity.',
      type: 'condo',
      status: 'for_rent',
      price: 220000,
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      yearBuilt: 2020,
      address: {
        street: '89 Beach Road',
        city: 'Negombo',
        state: 'Western Province',
        zipCode: '11500',
        country: 'Sri Lanka',
      },
      location: { type: 'Point', coordinates: [79.8358, 7.2083] },
    },
  ];

  return Property.insertMany(
    ads.map((ad, index) => ({
      ...ad,
      amenities: ['Parking', 'Security', 'Balcony', 'Garden'].slice(0, 3 + (index % 2)),
      images: [pick(sriLankaImagePool), pick(sriLankaImagePool)],
      moderationStatus: 'approved',
      moderationNotes: '',
      whatsappNumber: '+94771234567',
      emailContact: DEMO_USER.email,
      averageRating: 0,
      numReviews: 0,
      agent: agentId,
      createdBy: createdById,
    }))
  );
}

async function seedDemoEngagement(
  demoUserId: Types.ObjectId,
  adminId: Types.ObjectId,
  demoAds: any[],
  otherProperties: any[]
) {
  const favorites = otherProperties.slice(0, 8).map((p) => p._id);

  await User.findByIdAndUpdate(demoUserId, {
    $set: {
      favorites,
      lastLogin: new Date(),
    },
  });

  await SavedSearch.deleteMany({ user: demoUserId });
  await SavedSearch.insertMany([
    {
      user: demoUserId,
      name: 'Colombo Premium Apartments',
      filters: { city: 'Colombo', type: 'apartment', minPrice: 30000000, maxPrice: 90000000 },
      isAlertEnabled: true,
      frequency: 'daily',
      isActive: true,
      lastRunAt: new Date(),
      lastResultCount: 9,
    },
    {
      user: demoUserId,
      name: 'Kandy Family Houses',
      filters: { city: 'Kandy', type: 'house', bedrooms: 3, status: 'for_sale' },
      isAlertEnabled: true,
      frequency: 'weekly',
      isActive: true,
      lastRunAt: new Date(),
      lastResultCount: 6,
    },
  ]);

  await Inquiry.deleteMany({ requester: demoUserId });
  await Visit.deleteMany({ requester: demoUserId });
  await Review.deleteMany({ user: demoUserId });
  await ChatThread.deleteMany({ participants: demoUserId });

  const activityTargets = otherProperties.slice(0, 3);
  for (const property of activityTargets) {
    await Review.create({
      user: demoUserId,
      property: property._id,
      rating: randomBetween(4, 5),
      comment: pick([
        'Very well maintained property with excellent accessibility.',
        'Detailed listing and trustworthy owner communication.',
        'Great location and fair pricing compared to nearby properties.',
      ]),
    });

    await Inquiry.create({
      property: property._id,
      requester: demoUserId,
      agent: property.agent,
      message: `I am interested in ${property.title}. Please share floor plan and negotiable terms.`,
      contactEmail: DEMO_USER.email,
      contactPhone: '+94771234567',
      status: 'contacted',
      statusNote: 'Demo user follow-up completed.',
    });

    const startAt = new Date(Date.now() + randomBetween(2, 10) * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    await Visit.create({
      property: property._id,
      requester: demoUserId,
      agent: property.agent,
      requestedStartAt: startAt,
      requestedEndAt: endAt,
      scheduledStartAt: startAt,
      scheduledEndAt: endAt,
      status: 'accepted',
      requesterNote: 'Looking for long-term ownership value.',
      agentNote: 'Visit confirmed by agent.',
    });

    await ChatThread.create({
      participants: [demoUserId, property.agent],
      property: property._id,
      lastMessage: 'Thank you, please share additional documents before the visit.',
      lastMessageAt: new Date(),
      isEscalated: false,
    });
  }

  const reportedProperty = otherProperties[8] || otherProperties[0];
  if (reportedProperty) {
    await Report.create({
      reporter: demoUserId,
      targetType: 'property',
      targetId: reportedProperty._id,
      reason: 'misleading_information',
      description: 'Price history appears inconsistent; requested admin review.',
      status: 'in_review',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      resolutionNote: 'Marked for manual moderation follow-up.',
    });
  }

  return {
    favoritesCount: favorites.length,
    activityProperties: activityTargets.length,
  };
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for demo profile bootstrap...');

    const demoUser = await ensureUser({
      ...DEMO_USER,
      role: 'agent',
    });
    const demoAdmin = await ensureUser({
      ...DEMO_ADMIN,
      role: 'admin',
    });

    const demoAds = await ensureDemoAds(
      demoUser._id as unknown as Types.ObjectId,
      demoUser._id as unknown as Types.ObjectId
    );

    const otherProperties = await Property.find({
      _id: { $nin: demoAds.map((ad) => ad._id) },
      moderationStatus: { $ne: 'rejected' },
    })
      .limit(20)
      .sort({ createdAt: -1 });

    const summary = await seedDemoEngagement(
      demoUser._id as unknown as Types.ObjectId,
      demoAdmin._id as unknown as Types.ObjectId,
      demoAds,
      otherProperties
    );

    const demoBuyer = await ensureUser({ ...DEMO_BUYER, role: 'user' });
    await User.findByIdAndUpdate(demoBuyer._id, {
      $set: { favorites: [...demoAds, ...otherProperties].slice(0, 4).map((p) => p._id) },
    });

    console.log(
      JSON.stringify(
        {
          demoUser: {
            email: DEMO_USER.email,
            role: demoUser.role,
            ads: demoAds.length,
            favorites: summary.favoritesCount,
            activitiesLinkedToProperties: summary.activityProperties,
            subscription: demoUser.subscription,
          },
          demoAdmin: {
            email: DEMO_ADMIN.email,
            role: demoAdmin.role,
          },
          demoBuyer: {
            email: DEMO_BUYER.email,
            role: demoBuyer.role,
          },
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('Demo bootstrap failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
