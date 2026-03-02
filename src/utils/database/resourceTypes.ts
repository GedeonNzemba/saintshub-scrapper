import { ObjectId } from 'mongodb';

export interface Resource {
  _id?: ObjectId;
  title: string;
  description?: string;
  url?: string;
  type?: string;
  category?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateResourceInput {
  title: string;
  description?: string;
  url?: string;
  type?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateResourceInput {
  title?: string;
  description?: string;
  url?: string;
  type?: string;
  category?: string;
  tags?: string[];
}

export interface ResourceFilter {
  type?: string;
  category?: string;
  tags?: string;
  search?: string;
}
