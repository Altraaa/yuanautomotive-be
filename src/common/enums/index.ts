/**
 * Central enum barrel. ALL status/type fields use these — never raw strings
 * (CLAUDE.md 🧩 ENUM rule). DB stores the UPPER_SNAKE token; response serializers
 * convert to the exact string the FE contract expects where they differ.
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPERADMIN',
}

/**
 * DB token is PRE_ORDER; FE JSON expects the hyphenated "PRE-ORDER".
 * Conversion happens in the product response mapper.
 */
export enum ProductBadge {
  BARU = 'BARU',
  HOT = 'HOT',
  TERLARIS = 'TERLARIS',
  PRE_ORDER = 'PRE_ORDER',
}

/** DB tokens are UPPER; FE JSON expects Title-case ("Tips", "Rilis", …). */
export enum BlogCategory {
  TIPS = 'TIPS',
  RILIS = 'RILIS',
  PANDUAN = 'PANDUAN',
  BERITA = 'BERITA',
}

/** DB tokens are UPPER; FE JSON expects Capitalized ("Reels", "Poster"). */
export enum NewsType {
  REELS = 'REELS',
  POSTER = 'POSTER',
}

export enum ContactStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  CLOSED = 'CLOSED',
}

export enum OrderStatus {
  NEW = 'NEW',
  PROCESSED = 'PROCESSED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  PDF = 'PDF',
}

export enum NotificationChannel {
  WHATSAPP = 'WHATSAPP',
}

export enum NotificationStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum NotificationEvent {
  CONTACT_CREATED = 'CONTACT_CREATED',
  ORDER_CREATED = 'ORDER_CREATED',
}
