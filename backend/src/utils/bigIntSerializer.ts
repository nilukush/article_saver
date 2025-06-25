/**
 * Utility to safely serialize BigInt values for JSON responses
 */

export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeBigInt(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Configure global JSON serialization to handle BigInt
 */
export function configureBigIntSerialization() {
  // Override BigInt serialization globally
  (BigInt.prototype as any).toJSON = function() {
    return Number(this);
  };
}