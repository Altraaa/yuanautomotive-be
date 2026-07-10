import { BadRequestException } from '@nestjs/common';
import { NewsType } from '../../common/enums';

/** DB token → FE JSON Capitalized ("Reels" | "Poster"), and back. */
const TO_JSON: Record<NewsType, string> = {
  [NewsType.REELS]: 'Reels',
  [NewsType.POSTER]: 'Poster',
};

const FROM_JSON: Record<string, NewsType> = Object.entries(TO_JSON).reduce(
  (acc, [token, label]) => {
    acc[label.toLowerCase()] = token as NewsType;
    return acc;
  },
  {} as Record<string, NewsType>,
);

export function newsTypeToJson(type: NewsType): string {
  return TO_JSON[type];
}

export function newsTypeFromJson(label: string): NewsType {
  const found = FROM_JSON[label?.toLowerCase()];
  if (!found) {
    throw new BadRequestException(
      `Invalid news type: ${label}. Allowed: ${Object.values(TO_JSON).join(', ')}`,
    );
  }
  return found;
}
