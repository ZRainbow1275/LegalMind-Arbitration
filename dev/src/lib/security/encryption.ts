// dev/src/lib/security/encryption.ts
// 数据加密和脱敏工具 - 等保三级标准

import crypto from 'crypto';
import { getEnv } from '../env-validator';
import { logger } from '../logger';

/**
 * 加密工具类
 * 使用AES-256-GCM加密算法（等保三级推荐）
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  
  /**
   * 获取加密密钥
   * 从环境变量读取，确保密钥安全
   */
  private static getEncryptionKey(): Buffer {
    const env = getEnv();
    const key = env.ENCRYPTION_KEY;
    
    if (!key || key.length < 32) {
      throw new Error('加密密钥未配置或长度不足（至少32字符）');
    }
    
    // 使用SHA-256生成32字节密钥
    return crypto.createHash('sha256').update(key).digest();
  }
  
  /**
   * 加密数据
   * @param plaintext 明文
   * @returns 加密后的数据（Base64编码）
   */
  static encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      
      // 生成随机IV（初始化向量）
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // 创建加密器
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      // 加密数据
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 获取认证标签
      const authTag = cipher.getAuthTag();
      
      // 组合IV、认证标签和加密数据
      const result = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]);
      
      return result.toString('base64');
    } catch (error) {
      logger.error({ err: error }, '数据加密失败');
      throw new Error('数据加密失败');
    }
  }
  
  /**
   * 解密数据
   * @param ciphertext 密文（Base64编码）
   * @returns 解密后的明文
   */
  static decrypt(ciphertext: string): string {
    try {
      const key = this.getEncryptionKey();
      
      // 解码Base64
      const buffer = Buffer.from(ciphertext, 'base64');
      
      // 提取IV、认证标签和加密数据
      const iv = buffer.subarray(0, this.IV_LENGTH);
      const authTag = buffer.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
      const encrypted = buffer.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH);
      
      // 创建解密器
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      // 解密数据
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error({ err: error }, '数据解密失败');
      throw new Error('数据解密失败');
    }
  }
  
  /**
   * 加密对象
   * @param obj 要加密的对象
   * @returns 加密后的字符串
   */
  static encryptObject<T>(obj: T): string {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }
  
  /**
   * 解密对象
   * @param ciphertext 密文
   * @returns 解密后的对象
   */
  static decryptObject<T>(ciphertext: string): T {
    const json = this.decrypt(ciphertext);
    return JSON.parse(json) as T;
  }
}

/**
 * 哈希工具类
 * 用于密码哈希和数据完整性验证
 */
export class HashUtil {
  private static readonly HASH_ALGORITHM = 'sha256';
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly PBKDF2_KEYLEN = 64;
  
  /**
   * 生成密码哈希（使用PBKDF2）
   * @param password 密码
   * @param salt 盐值（可选，不提供则自动生成）
   * @returns 哈希结果（包含盐值）
   */
  static async hashPassword(password: string, salt?: string): Promise<string> {
    try {
      // 生成或使用提供的盐值
      const saltBuffer = salt 
        ? Buffer.from(salt, 'hex')
        : crypto.randomBytes(32);
      
      // 使用PBKDF2生成哈希
      const hash = await new Promise<Buffer>((resolve, reject) => {
        crypto.pbkdf2(
          password,
          saltBuffer,
          this.PBKDF2_ITERATIONS,
          this.PBKDF2_KEYLEN,
          this.HASH_ALGORITHM,
          (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
          }
        );
      });
      
      // 组合盐值和哈希值
      return `${saltBuffer.toString('hex')}:${hash.toString('hex')}`;
    } catch (error) {
      logger.error({ err: error }, '密码哈希失败');
      throw new Error('密码哈希失败');
    }
  }
  
  /**
   * 验证密码
   * @param password 密码
   * @param hashedPassword 哈希后的密码
   * @returns 是否匹配
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [salt] = hashedPassword.split(':');
      const newHash = await this.hashPassword(password, salt);
      return newHash === hashedPassword;
    } catch (error) {
      logger.error({ err: error }, '密码验证失败');
      return false;
    }
  }
  
  /**
   * 生成SHA-256哈希
   * @param data 数据
   * @returns 哈希值（十六进制）
   */
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * 生成HMAC签名
   * @param data 数据
   * @param secret 密钥
   * @returns HMAC签名
   */
  static hmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}

/**
 * 数据脱敏工具类
 * 用于保护敏感信息显示
 */
export class DataMaskingUtil {
  /**
   * 脱敏手机号
   * @param phone 手机号
   * @returns 脱敏后的手机号（例如：138****5678）
   */
  static maskPhone(phone: string): string {
    if (!phone || phone.length < 11) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  
  /**
   * 脱敏邮箱
   * @param email 邮箱
   * @returns 脱敏后的邮箱（例如：abc***@example.com）
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.substring(0, 3)}***@${domain}`;
  }
  
  /**
   * 脱敏身份证号
   * @param idCard 身份证号
   * @returns 脱敏后的身份证号（例如：110***********1234）
   */
  static maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 18) return idCard;
    return idCard.replace(/(\d{3})\d{11}(\d{4})/, '$1***********$2');
  }
  
  /**
   * 脱敏姓名
   * @param name 姓名
   * @returns 脱敏后的姓名（例如：张*、欧阳**）
   */
  static maskName(name: string): string {
    if (!name || name.length === 0) return name;
    if (name.length === 1) return name;
    if (name.length === 2) return `${name[0]}*`;
    return `${name[0]}${'*'.repeat(name.length - 1)}`;
  }
  
  /**
   * 脱敏银行卡号
   * @param cardNumber 银行卡号
   * @returns 脱敏后的银行卡号（例如：6222 **** **** 1234）
   */
  static maskBankCard(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 16) return cardNumber;
    const cleaned = cardNumber.replace(/\s/g, '');
    return cleaned.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2');
  }
  
  /**
   * 脱敏地址
   * @param address 地址
   * @returns 脱敏后的地址（保留省市，隐藏详细地址）
   */
  static maskAddress(address: string): string {
    if (!address || address.length < 10) return address;
    // 保留前10个字符（通常是省市区），其余用***代替
    return `${address.substring(0, 10)}***`;
  }
  
  /**
   * 脱敏IP地址
   * @param ip IP地址
   * @returns 脱敏后的IP（例如：192.168.***.***）
   */
  static maskIP(ip: string): string {
    if (!ip || !ip.includes('.')) return ip;
    const parts = ip.split('.');
    if (parts.length !== 4) return ip;
    return `${parts[0]}.${parts[1]}.***. ***`;
  }
  
  /**
   * 通用脱敏（保留前后各n个字符）
   * @param text 文本
   * @param keepStart 保留开头字符数
   * @param keepEnd 保留结尾字符数
   * @returns 脱敏后的文本
   */
  static maskGeneric(text: string, keepStart: number = 3, keepEnd: number = 3): string {
    if (!text || text.length <= keepStart + keepEnd) return text;
    const start = text.substring(0, keepStart);
    const end = text.substring(text.length - keepEnd);
    const maskLength = text.length - keepStart - keepEnd;
    return `${start}${'*'.repeat(Math.min(maskLength, 10))}${end}`;
  }
  
  /**
   * 脱敏对象中的敏感字段
   * @param obj 对象
   * @param sensitiveFields 敏感字段列表
   * @returns 脱敏后的对象
   */
  static maskObject<T extends Record<string, unknown>>(
    obj: T,
    sensitiveFields: Array<keyof T>
  ): T {
    const masked: T = { ...obj };

    for (const field of sensitiveFields) {
      const value = masked[field];
      if (typeof value === 'string') {
        // 根据字段名选择合适的脱敏方法
        const fieldName = String(field);
        let maskedValue: string;
        if (fieldName.includes('phone') || fieldName.includes('mobile')) {
          maskedValue = this.maskPhone(value);
        } else if (field.toString().includes('email')) {
          maskedValue = this.maskEmail(value);
        } else if (field.toString().includes('idCard') || field.toString().includes('idNumber')) {
          maskedValue = this.maskIdCard(value);
        } else if (field.toString().includes('name')) {
          maskedValue = this.maskName(value);
        } else if (field.toString().includes('card') || field.toString().includes('account')) {
          maskedValue = this.maskBankCard(value);
        } else {
          maskedValue = this.maskGeneric(value);
        }

        masked[field] = maskedValue as unknown as T[keyof T];
      }
    }

    return masked;
  }
}

/**
 * 随机数生成工具
 * 使用加密安全的随机数生成器
 */
export class SecureRandomUtil {
  /**
   * 生成随机字符串
   * @param length 长度
   * @returns 随机字符串
   */
  static generateRandomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }
  
  /**
   * 生成随机数字
   * @param min 最小值
   * @param max 最大值
   * @returns 随机数字
   */
  static generateRandomNumber(min: number, max: number): number {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const randomBytes = crypto.randomBytes(bytesNeeded);
    const randomValue = randomBytes.readUIntBE(0, bytesNeeded);
    return min + (randomValue % range);
  }
  
  /**
   * 生成UUID v4
   * @returns UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }
}
