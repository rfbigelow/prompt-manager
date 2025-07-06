export interface ParsedArgs {
  _: Array<string | number>;
  help?: boolean;
  list?: boolean;
  verbose?: boolean;
  name?: string;
  file?: string;
  message?: string;
  // Aliases
  h?: boolean;
  l?: boolean;
  v?: boolean;
  n?: string;
  f?: string;
  m?: string;
  // Allow other string properties for flexibility
  [key: string]: unknown;
}
