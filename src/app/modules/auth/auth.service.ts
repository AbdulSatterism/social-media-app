/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyEmail,
} from '../../../types/auth';
// import cryptoToken from '../../../util/cryptoToken';
import generateOTP from '../../../util/generateOTP';

import { User } from '../user/user.model';
import { ResetToken } from '../resetToken/resetToken.model';
import AppError from '../../errors/AppError';
import { sendSMS } from '../../../util/verifyByTwilio';

//login
const loginUserFromDB = async (payload: ILoginData) => {
  const { phone, password } = payload;

  const isExistUser = await User.findOne({ phone }).select('+password');
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //check verified and status
  if (!isExistUser.verified) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please verify your account, then try to login again',
    );
  }

  //check match password
  if (
    password &&
    !(await User.isMatchPassword(password, isExistUser.password))
  ) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
  }

  const tokenPayload = {
    id: isExistUser._id,
    role: isExistUser.role,
    phone: isExistUser.phone,
  };

  //create access token
  const accessToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  //create refresh token
  const refreshToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string,
  );

  // send user data without password
  const { password: _, ...userWithoutPassword } = isExistUser.toObject();

  return { user: userWithoutPassword, accessToken, refreshToken };
};

//forget password
const forgetPasswordToDB = async (phone: string) => {
  const isExistUser = await User.findOne({ phone: phone }).select(
    '+authentication',
  );
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const otp = generateOTP();
  //send sms
  // const message = `re: Your one-time code for verification is ${otp}.`;

  const message = `re: Your one-time code for verification is: ${otp}`;

  await sendSMS(isExistUser?.phone, message);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 20 * 60000),
  };
  await User.findOneAndUpdate(
    { phone: isExistUser.phone },
    { $set: { authentication } },
  );
};

const verifyEmailToDB = async (payload: IVerifyEmail) => {
  const { phone, oneTimeCode } = payload;

  const isExistUser = await User.findOne({ phone }).select('+authentication');

  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!oneTimeCode) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please give the otp, check your phone message inbox',
    );
  }

  if (isExistUser.authentication?.oneTimeCode !== oneTimeCode) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'You provided wrong otp');
  }

  const date = new Date();
  if (date > isExistUser.authentication?.expireAt) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Otp already expired, Please try again',
    );
  }

  const tokenPayload = {
    id: isExistUser._id,
    role: isExistUser.role,
    phone: isExistUser.phone,
  };

  //create access token
  const accessToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  //create refresh token
  const refreshToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string,
  );

  let message;
  let data;

  if (!isExistUser.verified) {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      { verified: true, authentication: { oneTimeCode: null, expireAt: null } },
    );
    message = 'Your account has been successfully verified.';
    data = { user: isExistUser, accessToken, refreshToken };
  } else {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      {
        authentication: {
          isResetPassword: true,
          oneTimeCode: null,
          expireAt: null,
        },
      },
    );

    // const createToken = cryptoToken();
    await ResetToken.create({
      user: isExistUser._id,
      token: accessToken,
      expireAt: new Date(Date.now() + 20 * 60000),
    });
    message = 'Verification Successful';
    data = { user: isExistUser, accessToken, refreshToken };
  }

  return { data, message };
};

const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword,
) => {
  const { newPassword, confirmPassword } = payload;

  //isExist token
  const isExistToken = await ResetToken.isExistToken(token);

  if (!isExistToken) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }

  //user permission check
  const isExistUser = await User.findById(isExistToken.user).select(
    '+authentication',
  );
  if (!isExistUser?.authentication?.isResetPassword) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "You don't have permission to change the password. Please click again to 'Forgot Password'",
    );
  }

  //validity check
  const isValid = await ResetToken.isExpireToken(token);
  if (!isValid) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Token expired, Please click again to the forget password',
    );
  }

  //check password
  if (newPassword !== confirmPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "New password and Confirm password doesn't match!",
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateData = {
    password: hashPassword,
    authentication: {
      isResetPassword: false,
    },
  };

  await User.findOneAndUpdate({ _id: isExistToken.user }, updateData, {
    new: true,
  });
};

const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword,
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;

  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //current password match
  if (
    currentPassword &&
    !(await User.isMatchPassword(currentPassword, isExistUser.password))
  ) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  //newPassword and current password
  if (currentPassword === newPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please give different password from current password',
    );
  }
  //new password and confirm password check
  if (newPassword !== confirmPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Password and Confirm password doesn't matched",
    );
  }

  //hash password
  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateData = {
    password: hashPassword,
  };
  await User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });
};

const deleteAccountToDB = async (user: JwtPayload) => {
  const result = await User.findByIdAndDelete(user?.id);
  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No User found');
  }

  return result;
};

const newAccessTokenToUser = async (token: string) => {
  // Check if the token is provided
  if (!token) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Token is required!');
  }

  const verifyUser = jwtHelper.verifyToken(
    token,
    config.jwt.jwtRefreshSecret as Secret,
  );

  const isExistUser = await User.findById(verifyUser?.id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized access');
  }

  //create token
  const accessToken = jwtHelper.createToken(
    { id: isExistUser._id, role: isExistUser.role, phone: isExistUser.phone },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  return { accessToken };
};

const resendVerificationEmailToDB = async (phone: string) => {
  // Find the user by ID
  const existingUser: any = await User.findOne({ phone: phone }).lean();

  if (!existingUser) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'User with this number does not exist!',
    );
  }

  if (existingUser?.isVerified) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'User is already verified!');
  }

  // Generate OTP and prepare email
  const otp = generateOTP();
  //send sms
  // const message = `re: Your one-time code for verification is ${otp}.`;

  const message = `re Your one-time code for verification is:${otp}.`;
  // const message = `${otp} is your one-time code for re: verification`;

  await sendSMS(existingUser?.phone, message);

  // Update user with authentication details
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 20 * 60000),
  };

  await User.findOneAndUpdate(
    { phone: existingUser?.phone },
    { $set: { authentication } },
    { new: true },
  );
};

export const AuthService = {
  verifyEmailToDB,
  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  deleteAccountToDB,
  newAccessTokenToUser,
  resendVerificationEmailToDB,
};
