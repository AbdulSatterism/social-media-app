/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema } from 'mongoose';
import config from '../../../config';
import { IUser, UserModal } from './user.interface';
import AppError from '../../errors/AppError';

const userSchema = new Schema<IUser, UserModal>(
  {
    name: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: false,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      // normalize: empty -> undefined so sparse unique is ignored
      set: (v: unknown) => {
        if (typeof v !== 'string') return undefined;
        const s = v.trim();
        return s.length ? s : undefined;
      },
    },
    role: {
      type: String,
      default: 'USER',
    },
    image: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHERS'],
      default: 'MALE',
    },
    dob: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isFirstLogin: {
      type: Boolean,
      default: false,
    },

    playerId: {
      type: [String],
      default: [],
    },

    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: 0,
    },
  },
  { timestamps: true },
);

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById(id);
  return isExist;
};

userSchema.statics.isExistUserByPhone = async (email: string) => {
  const isExist = await User.findOne({ email });
  return isExist;
};

// static helpers
userSchema.statics.findByPhone = function (identifier: string) {
  // rudimentary check
  const isEmail = identifier.includes('@');
  return this.findOne(
    isEmail ? { email: identifier.toLowerCase() } : { phone: identifier },
  ).select('+password');
};

//account check
userSchema.statics.isAccountCreated = async (id: string) => {
  const isUserExist: any = await User.findById(id);
  return isUserExist.accountInformation.status;
};

//is match password
userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

//check user
userSchema.pre('save', async function (next) {
  //check user
  const isExist = await User.findOne({
    phone: this.phone,
  });

  if (isExist) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'phone number already used!');
  }

  //password hash
  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds),
  );
  next();
});

export const User = model<IUser, UserModal>('User', userSchema);
