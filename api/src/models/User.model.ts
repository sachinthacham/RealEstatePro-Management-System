import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'agent' | 'admin';
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  company?: string;
  licenseNumber?: string;
  bio?: string;
  experience?: number;
  specialty?: string[];
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
  favorites: mongoose.Types.ObjectId[];
  notificationPreferences: {
    emailDigest: 'instant' | 'daily' | 'weekly';
    pushEnabled: boolean;
    smsEnabled: boolean;
  };
  subscription: {
    plan: 'REGULAR' | 'BUSINESS' | 'PREMIUM';
    startDate: Date;
    endDate: Date; // Null if lifetime/free, or set date
    status: 'active' | 'expired' | 'canceled';
    paymentId?: string; // To store Stripe reference
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
    phone: String,
    profileImage: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLogin: Date,
    company: String,
    licenseNumber: String,
    bio: { type: String, maxlength: 1000 },
    experience: { type: Number, default: 0 },
    specialty: { type: [String], enum: ['residential', 'commercial', 'luxury', 'rental', 'investment'] },
    socialMedia: { facebook: String, twitter: String, linkedin: String, instagram: String },
    favorites: [{ type: Schema.Types.ObjectId, ref: 'Property', default: [] }],
    notificationPreferences: {
      emailDigest: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'daily' },
      pushEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
    },
    subscription: {
      plan: { 
        type: String, 
        enum: ['REGULAR', 'BUSINESS', 'PREMIUM'], 
        default: 'REGULAR' 
      },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date }, 
      status: { 
        type: String, 
        enum: ['active', 'expired', 'canceled'], 
        default: 'active' 
      },
      paymentId: String
    }
    
  },
  { timestamps: true }
);

UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generatePasswordResetToken = function (): string {
  // A. Generate a random 20-byte buffer and convert to hex string
  const resetToken = crypto.randomBytes(32).toString('hex');
  // B. Hash the token and save it to the database field (Security best practice)
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  // C. Set expiration to 10 minutes from now
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  // D. Return the RAW token (to be sent in email)
  return resetToken;
};

UserSchema.methods.generateEmailVerificationToken = function (): string {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return verificationToken;
};

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
  }
  if (this.loginAttempts >= 5 && !this.lockUntil) {
    this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
  }
  await this.save();
};

export default mongoose.model<IUser>('User', UserSchema);