import type { BankEmailParser, NormalizedEmail } from './types';
import { BhdEmailParser } from './parsers/bhd-email.parser';

const parsers: BankEmailParser[] = [new BhdEmailParser()];

export class ParserRegistry {
  public static forInstitution(institutionCode: string) {
    return parsers.find((parser) => parser.institutionCode === institutionCode.toUpperCase()) || null;
  }

  public static detect(email: NormalizedEmail) {
    return parsers.find((parser) => parser.canParse(email)) || null;
  }
}
