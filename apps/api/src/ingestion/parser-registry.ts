import type { BankEmailParser, NormalizedEmail } from './types';
import { BhdEmailParser } from './parsers/bhd-email.parser';
import { QikEmailParser } from './parsers/qik-email.parser';

const parsers: BankEmailParser[] = [new BhdEmailParser(), new QikEmailParser()];

export class ParserRegistry {
  public static forInstitution(institutionCode: string) {
    return parsers.find((parser) => parser.institutionCode === institutionCode.toUpperCase()) || null;
  }

  public static detect(email: NormalizedEmail) {
    return parsers.find((parser) => parser.canParse(email)) || null;
  }

  public static supportedInstitutionCodes() {
    return parsers.map((parser) => parser.institutionCode);
  }
}
