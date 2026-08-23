import bcrypt from "bcryptjs";

/** Cost 10 ≈ 60ms on typical serverless CPU — enough work factor without
 *  blowing the function timeout on cold starts. */
const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
