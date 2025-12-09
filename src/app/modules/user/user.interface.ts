/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export type IUser = {
  name?: string;
  email?: string;
  phone: string;
  password: string;
  role?: 'ADMIN' | 'USER';
  gender?: 'MALE' | 'FEMALE' | 'OTHERS';
  image?: string;
  dob?: Date;
  isDeleted?: boolean;
  isBlocked?: boolean;
  isFirstLogin?: boolean;
  playerId?: [string];
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
  verified: boolean;
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByPhone(phone: string): any;
  isAccountCreated(id: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
