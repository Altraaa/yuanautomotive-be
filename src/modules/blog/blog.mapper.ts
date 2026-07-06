import { BadRequestException } from '@nestjs/common';
import { BlogCategory } from '../../common/enums';

/** DB token → FE JSON Title-case, and back. Single source for both directions. */
const TO_JSON: Record<BlogCategory, string> = {
  [BlogCategory.TIPS]: 'Tips',
  [BlogCategory.RILIS]: 'Rilis',
  [BlogCategory.PANDUAN]: 'Panduan',
  [BlogCategory.BERITA]: 'Berita',
};

const FROM_JSON: Record<string, BlogCategory> = Object.entries(TO_JSON).reduce(
  (acc, [token, label]) => {
    acc[label.toLowerCase()] = token as BlogCategory;
    return acc;
  },
  {} as Record<string, BlogCategory>,
);

export function blogCategoryToJson(category: BlogCategory): string {
  return TO_JSON[category];
}

export function blogCategoryFromJson(label: string): BlogCategory {
  const found = FROM_JSON[label?.toLowerCase()];
  if (!found) {
    throw new BadRequestException(
      `Invalid blog category: ${label}. Allowed: ${Object.values(TO_JSON).join(', ')}`,
    );
  }
  return found;
}
