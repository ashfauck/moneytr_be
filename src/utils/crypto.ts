import bcrypt from 'bcryptjs';
import config from './config';

export class HashUtils {
  /**
   * Hash a password/PIN using bcrypt
   */
  static async hash(value: string): Promise<string> {
    const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
    return bcrypt.hash(value, salt);
  }

  /**
   * Compare a plain value with a hashed value
   */
  static async compare(plainValue: string, hashedValue: string): Promise<boolean> {
    return bcrypt.compare(plainValue, hashedValue);
  }
}
