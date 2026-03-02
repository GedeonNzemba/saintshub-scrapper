import { ObjectId } from 'mongodb';

// ============= COMMON TYPES =============

export interface Video {
  title: string;
  description?: string;
  posterUrl?: string;
  pageUrl?: string;
  videoUrl: string;
  duration?: string;
}

export interface VideoContent {
  videoUrl: string;
  info?: string;
  heading?: string;
  description?: string;
}

export interface CollectionVideo {
  title: string;
  poster: string;
  content?: VideoContent;
}

export interface ImageMedia {
  imageUrl: string;
  caption?: string;
  altText?: string;
}

// ============= JESUS RESOURCE TYPE =============

export interface Section {
  sectionName: string;
  sectionPoster: string;
  videos: Video[];
}

export interface JourneyCardInfo {
  title: string;
  image: string;
}

export interface JourneyItem {
  info: string;
  description: string;
  image: string;
  href?: string;
  mainContent: {
    date: string;
    title: string;
    description: string;
    poster?: string;
    videoUrl?: string;
    videos?: Array<{
      title: string;
      poster: string;
      videoUrl: string;
    }>;
  };
}

export interface JourneyTemplate {
  templateId: string;
  cardInfo: JourneyCardInfo;
  cartItems: {
    title: string;
    Items: JourneyItem[];
  };
}

export interface Collection {
  collectionId: string;
  bannerImage: string;
  count: string;
  title: string;
  description: string;
  videos: CollectionVideo[];
}

export interface JesusResource {
  _id?: ObjectId;
  resourceType: 'Jesus';
  sections: Section[];
  journeyTemplates: JourneyTemplate[];
  collections: Collection[];
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============= BILLY GRAHAM RESOURCE TYPE =============

export interface TVVideo {
  duration: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  text: string;
}

export interface BillyGrahamResource {
  _id?: ObjectId;
  resourceType: 'Billy_Graham';
  about: {
    header: string;
    profileSummary: string;
    contentFlow: any[];
  };
  media: {
    banner: string;
    images: any[];
  };
  videoLibrary: {
    tvClassics: TVVideo[];
    tvSpecials: TVVideo[];
  };
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============= GORDON LINDSAY RESOURCE TYPE =============

export interface GordonLindsayVideo {
  duration: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  text: string;
}

export interface GordonLindsayResource {
  _id?: ObjectId;
  resourceType: 'Gordon_Lindsay';
  about: {
    title: string;
    photo: string;
    intro: string;
    sections: any[];
  };
  collection: GordonLindsayVideo[];
  media: ImageMedia[];
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============= ORAL ROBERTS RESOURCE TYPE =============

export interface OralRobertsMessage {
  duration: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  text: string;
}

export interface PDFSubmission {
  [key: string]: any;
}

export interface OralRobertsResource {
  _id?: ObjectId;
  resourceType: 'Oral_Roberts';
  about: {
    title: string;
    abstract: string;
    'miracles and healing': string;
    pdfURL: string;
  };
  'Classic Messages': OralRobertsMessage[];
  PDF: {
    series_title: string;
    intro_text: string;
    submissions: PDFSubmission[];
  };
  media: ImageMedia[];
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============= WILLIAM BRANHAM RESOURCE TYPE =============

export interface WilliamBranhamPhoto {
  title: string;
  url: string;
}

export interface WilliamBranhamPoster {
  title: string;
  image: string;
  text: string;
}

export interface WilliamBranhamBooklet {
  title: string;
  image: string;
  text: string;
  pdf: string;
}

export interface WilliamBranhamDocument {
  title: string;
  image: string;
}

export interface WilliamBranhamVideos {
  Featured: any[];
  'Eye Witness': any[];
  Agapao: any[];
  Inspirational: any[];
}

export interface WilliamBranhamMediaItem {
  reference: string;
  location: string;
  duration: string;
  title: string;
  PDF: string;
  audio: string;
}

// Media organized by year (e.g., "1947", "1948", etc.)
export type WilliamBranhamMedia = Record<string, WilliamBranhamMediaItem[]>;

export interface WilliamBranhamResource {
  _id?: ObjectId;
  resourceType: 'William_Branham';
  about: {
    title: string;
    image: string;
    text: string;
    paragraphs: any[];
  };
  photos: WilliamBranhamPhoto[];
  posters: WilliamBranhamPoster[];
  Booklets: WilliamBranhamBooklet[];
  articles: Record<string, any>;
  Documents: WilliamBranhamDocument[];
  Videos: WilliamBranhamVideos;
  media?: WilliamBranhamMedia;
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============= BANNER RESOURCE TYPE =============

export interface MinisterBanner {
  name: string;
  photo: string;
  info?: string;
  site?: string;
}

export interface BannerResource {
  _id?: ObjectId;
  resourceType: 'Banner';
  category: string;
  'William Branham'?: MinisterBanner;
  'Young Brown'?: MinisterBanner;
  'Jack Moore'?: MinisterBanner;
  'Oral Roberts'?: MinisterBanner;
  'Gordon Lindsay'?: MinisterBanner;
  'Billy Graham'?: MinisterBanner;
  'A. A. Allen'?: MinisterBanner;
  'Kathryn Kuhlman'?: MinisterBanner;
  'John G. Lake'?: MinisterBanner;
  'Charles H. Spurgeon'?: MinisterBanner;
  paul?: MinisterBanner;
  wesley?: MinisterBanner;
  luther?: MinisterBanner;
  columba?: MinisterBanner;
  martin?: MinisterBanner;
  Irenaeus?: MinisterBanner;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============= DISCRIMINATED UNION TYPE =============

export type Resource = 
  | JesusResource 
  | BillyGrahamResource 
  | GordonLindsayResource 
  | OralRobertsResource 
  | WilliamBranhamResource 
  | BannerResource;

// ============= INPUT TYPES FOR CREATION =============

export type CreateJesusResourceInput = Omit<JesusResource, '_id' | 'createdAt' | 'updatedAt'>;
export type CreateBillyGrahamResourceInput = Omit<BillyGrahamResource, '_id' | 'createdAt' | 'updatedAt'>;
export type CreateGordonLindsayResourceInput = Omit<GordonLindsayResource, '_id' | 'createdAt' | 'updatedAt'>;
export type CreateOralRobertsResourceInput = Omit<OralRobertsResource, '_id' | 'createdAt' | 'updatedAt'>;
export type CreateWilliamBranhamResourceInput = Omit<WilliamBranhamResource, '_id' | 'createdAt' | 'updatedAt'>;
export type CreateBannerResourceInput = Omit<BannerResource, '_id' | 'createdAt' | 'updatedAt'>;

export type CreateResourceInput = 
  | CreateJesusResourceInput
  | CreateBillyGrahamResourceInput
  | CreateGordonLindsayResourceInput
  | CreateOralRobertsResourceInput
  | CreateWilliamBranhamResourceInput
  | CreateBannerResourceInput;

// ============= UPDATE TYPES =============

export type UpdateJesusResourceInput = Partial<Omit<JesusResource, '_id' | 'resourceType' | 'createdAt' | 'updatedAt'>>;
export type UpdateBillyGrahamResourceInput = Partial<Omit<BillyGrahamResource, '_id' | 'resourceType' | 'createdAt' | 'updatedAt'>>;
export type UpdateGordonLindsayResourceInput = Partial<Omit<GordonLindsayResource, '_id' | 'resourceType' | 'createdAt' | 'updatedAt'>>;
export type UpdateOralRobertsResourceInput = Partial<Omit<OralRobertsResource, '_id' | 'resourceType' | 'createdAt' | 'updatedAt'>>;
export type UpdateWilliamBranhamResourceInput = Partial<Omit<WilliamBranhamResource, '_id' | 'resourceType' | 'createdAt' | 'updatedAt'>>;
export type UpdateBannerResourceInput = Partial<Omit<BannerResource, '_id' | 'resourceType' | 'createdAt' | 'updatedAt'>>;

// ============= QUERY FILTERS =============

export interface ResourceFilter {
  resourceType?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ============= API RESPONSE TYPES =============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
