/**
 * Custom error hierarchy for @rahul_dadhich15/encoding-kit
 */

export class EncodingError extends Error {
  readonly code: string;

  constructor(message: string, code = 'ERR_ENCODING') {
    super(message);
    this.name = 'EncodingError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DecodingError extends Error {
  readonly code: string;

  constructor(message: string, code = 'ERR_DECODING') {
    super(message);
    this.name = 'DecodingError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends Error {
  readonly code: string;

  constructor(message: string, code = 'ERR_VALIDATION') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
