import { Schema, Document, Model } from 'mongoose';

/**
 * Common fields for all documents
 * Provides audit trail and soft delete functionality
 */
export interface IBaseDocument extends Document {
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Schema.Types.ObjectId;
}

/**
 * Base schema options that all schemas should inherit
 * Ensures consistency across all collections
 */
export const baseSchemaOptions = {
  timestamps: true, // Automatically manage createdAt and updatedAt
  versionKey: 'string | false | undefined', // Disable __v field
  toJSON: {
    virtuals: true, // Include virtual fields in JSON output
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      // Transform _id to id and remove internal fields
      ret.id = ret._id;
      delete ret._id;
      delete ret.isDeleted;
      delete ret.deletedAt;
      delete ret.deletedBy;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
  },
};

/**
 * Add pagination plugin to schema
 * Provides consistent pagination across all collections
 */
export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sort?: string | Record<string, 1 | -1>;
  select?: string | Record<string, 1 | 0>;
}

export interface IPaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function addPaginationPlugin<T extends Document>(schema: Schema<T>): void {
  schema.statics.paginate = async function (
    filter: Record<string, unknown> = {},
    options: IPaginationOptions = {}
  ): Promise<IPaginationResult<T>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10)); // Max 100 items per page
    const skip = (page - 1) * limit;

    const query = this.find(filter);

    if (options.select) {
      query.select(options.select);
    }

    if (options.sort) {
      query.sort(options.sort);
    }

    const [items, total] = await Promise.all([
      query.skip(skip).limit(limit).exec(),
      this.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  };
}

/**
 * Create indexes for common query patterns
 * Call this after all schemas are defined
 */
export async function createBaseIndexes<T extends Document>(model: Model<T>): Promise<void> {
  try {
    // Index for soft delete queries
    await model.collection.createIndex({ isDeleted: 1 });

    // Index for timestamps (useful for sorting)
    await model.collection.createIndex({ createdAt: -1 });
    await model.collection.createIndex({ updatedAt: -1 });

    console.log(`✅ Created base indexes for ${model.collection.name}`);
  } catch (error) {
    console.error(`❌ Error creating indexes for ${model.collection.name}:`, error);
  }
}
