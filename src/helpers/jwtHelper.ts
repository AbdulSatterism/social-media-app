import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

// const createToken = (
//   payload: object,
//   secret: Secret,
//   expireTime: string | number,
// ) => {
//   return jwt.sign(payload, secret, { expiresIn: expireTime });
// };

export const createToken = (
  payload: object,
  secret: Secret,
  expireTime: string | number,
): string => {
  return jwt.sign(payload, secret, { expiresIn: expireTime } as SignOptions);
};

const verifyToken = (token: string, secret: Secret) => {
  return jwt.verify(token, secret) as JwtPayload;
};

export const jwtHelper = { createToken, verifyToken };
