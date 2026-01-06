import { ParseError } from './errors';

/**
 * Successful parse result containing the parsed value
 */
export interface ParseSuccess<T> {
  success: true;
  value: T;
}

/**
 * Failed parse result containing the error
 */
export interface ParseFailure {
  success: false;
  error: ParseError;
}

/**
 * Union type for parse results - either success with value or failure with error
 */
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/**
 * Create a successful parse result
 */
export function success<T>(value: T): ParseSuccess<T> {
  return { success: true, value };
}

/**
 * Create a failed parse result
 */
export function failure(error: ParseError): ParseFailure {
  return { success: false, error };
}
