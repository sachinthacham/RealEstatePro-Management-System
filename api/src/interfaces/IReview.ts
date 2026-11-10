import { Document } from 'mongoose';
import { IUserResponse } from './IUser';   
import { IProperty } from './IProperty';      

export interface IReview extends Document {
  user: string | IUserResponse;    // Can be ID or populated User object
  property: string | IProperty;    // Can be ID or populated Property object
  rating: number;                  // 1 to 5
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewRequest {
  rating: number;
  comment: string;
}