/**
 * Token types for the expression lexer
 */
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',      // 123, 3.14, 1e-5, 1.5e+3

  // Constants
  PI = 'PI',              // pi, PI, unicode-pi

  // Imaginary unit
  I = 'I',                // i, I (complex parser only)

  // Operators
  PLUS = 'PLUS',          // +
  MINUS = 'MINUS',        // -
  STAR = 'STAR',          // *
  SLASH = 'SLASH',        // /

  // Grouping
  LPAREN = 'LPAREN',      // (
  RPAREN = 'RPAREN',      // )

  // Functions
  SQRT = 'SQRT',          // sqrt

  // Special
  EOF = 'EOF',            // End of input
}

/**
 * A token produced by the lexer
 */
export interface Token {
  /** The type of token */
  type: TokenType;
  /** The original text of the token */
  lexeme: string;
  /** For NUMBER tokens, the parsed numeric value */
  value?: number;
  /** Character position in the original source (0-indexed) */
  position: number;
}
