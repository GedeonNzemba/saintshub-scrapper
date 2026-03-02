import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from './connection';
import { 
  Resource,
  CreateResourceInput,
  ResourceFilter,
  ApiResponse,
  Section,
  JourneyTemplate,
  Collection as ResourceCollection
} from './resourceSchemas';

const COLLECTION_NAME = 'resources';

function getResourcesCollection(): Collection<Resource> {
  const db = getDatabase();
  return db.collection<Resource>(COLLECTION_NAME);
}

// Initialize indexes for optimal query performance
export async function initializeResourceIndexes(): Promise<void> {
  const collection = getResourcesCollection();
  
  try {
    // Single field indexes
    await collection.createIndex({ resourceType: 1 });
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ updatedAt: -1 });
    
    // Compound indexes for common queries
    await collection.createIndex({ resourceType: 1, category: 1 });
    await collection.createIndex({ resourceType: 1, createdAt: -1 });
    
    // Text index for search functionality
    await collection.createIndex({
      'sections.sectionName': 'text',
      'sections.videos.title': 'text',
      'sections.videos.description': 'text',
      'collections.title': 'text',
      'collections.description': 'text',
      'journeyTemplates.templateId': 'text'
    });
    
    // Nested field indexes for specific resource types
    await collection.createIndex({ 'sections.sectionName': 1 });
    await collection.createIndex({ 'collections.collectionId': 1 });
    await collection.createIndex({ 'journeyTemplates.templateId': 1 });
    
    console.log('✅ Resource indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

// ============= MAIN RESOURCE CRUD OPERATIONS =============

export async function createResource(data: CreateResourceInput): Promise<ApiResponse<Resource>> {
  try {
    const collection = getResourcesCollection();
    
    const resource: any = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(resource);
    
    return {
      success: true,
      data: {
        ...resource,
        _id: result.insertedId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create resource',
        details: error
      }
    };
  }
}

export async function getAllResources(filter?: ResourceFilter): Promise<ApiResponse<Resource[]>> {
  try {
    const collection = getResourcesCollection();
    const query: any = {};
    
    // Build query based on filters
    if (filter) {
      if (filter.resourceType) {
        query.resourceType = filter.resourceType;
      }
      if (filter.category) {
        query.category = filter.category;
      }
      if (filter.search) {
        query.$text = { $search: filter.search };
      }
    }

    // Pagination
    const page = filter?.page || 1;
    const limit = filter?.limit || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = filter?.sort || 'createdAt';
    const sortOrder = filter?.order === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Execute query with pagination
    const resources = await collection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination metadata
    const total = await collection.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: resources,
      metadata: {
        page,
        limit,
        total,
        totalPages
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch resources',
        details: error
      }
    };
  }
}

export async function getResourceById(id: string): Promise<ApiResponse<Resource>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(id)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const resource = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!resource) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Resource with id ${id} not found`
        }
      };
    }

    return {
      success: true,
      data: resource
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch resource',
        details: error
      }
    };
  }
}

export async function updateResource(
  id: string, 
  data: Partial<Resource>
): Promise<ApiResponse<Resource>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(id)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.createdAt;

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Resource with id ${id} not found`
        }
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update resource',
        details: error
      }
    };
  }
}

export async function deleteResource(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(id)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Resource with id ${id} not found`
        }
      };
    }

    return {
      success: true,
      data: { deleted: true }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete resource',
        details: error
      }
    };
  }
}

export async function deleteAllResources(): Promise<ApiResponse<{ deletedCount: number }>> {
  try {
    const collection = getResourcesCollection();
    const result = await collection.deleteMany({});
    
    return {
      success: true,
      data: { deletedCount: result.deletedCount || 0 }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_DELETE_ALL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete all resources',
        details: error
      }
    };
  }
}

// ============= NESTED OPERATIONS FOR JESUS RESOURCE TYPE =============

// Sections Operations
export async function addSection(
  resourceId: string,
  section: Section
): Promise<ApiResponse<Resource>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(resourceId)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(resourceId), resourceType: 'Jesus' },
      { 
        $push: { sections: section },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Jesus resource with id ${resourceId} not found`
        }
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SECTION_ADD_ERROR',
        message: error instanceof Error ? error.message : 'Failed to add section',
        details: error
      }
    };
  }
}

export async function updateSection(
  resourceId: string,
  sectionName: string,
  updateData: Partial<Section>
): Promise<ApiResponse<Resource>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(resourceId)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const setFields: any = { updatedAt: new Date() };
    Object.keys(updateData).forEach(key => {
      setFields[`sections.$.${key}`] = (updateData as any)[key];
    });

    const result = await collection.findOneAndUpdate(
      { 
        _id: new ObjectId(resourceId), 
        resourceType: 'Jesus',
        'sections.sectionName': sectionName 
      },
      { $set: setFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return {
        success: false,
        error: {
          code: 'SECTION_NOT_FOUND',
          message: `Section '${sectionName}' not found in resource ${resourceId}`
        }
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SECTION_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update section',
        details: error
      }
    };
  }
}

export async function deleteSection(
  resourceId: string,
  sectionName: string
): Promise<ApiResponse<Resource>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(resourceId)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(resourceId), resourceType: 'Jesus' },
      { 
        $pull: { sections: { sectionName } },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Jesus resource with id ${resourceId} not found`
        }
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SECTION_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete section',
        details: error
      }
    };
  }
}

// Get sections from a resource
export async function getSections(
  resourceId: string
): Promise<ApiResponse<Section[]>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(resourceId)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const resource = await collection.findOne(
      { _id: new ObjectId(resourceId), resourceType: 'Jesus' },
      { projection: { sections: 1 } }
    );

    if (!resource) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Jesus resource with id ${resourceId} not found`
        }
      };
    }

    return {
      success: true,
      data: (resource as any).sections || []
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SECTIONS_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch sections',
        details: error
      }
    };
  }
}

// Journey Templates Operations
export async function getJourneyTemplates(
  resourceId: string
): Promise<ApiResponse<JourneyTemplate[]>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(resourceId)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const resource = await collection.findOne(
      { _id: new ObjectId(resourceId), resourceType: 'Jesus' },
      { projection: { journeyTemplates: 1 } }
    );

    if (!resource) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Jesus resource with id ${resourceId} not found`
        }
      };
    }

    return {
      success: true,
      data: (resource as any).journeyTemplates || []
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'JOURNEYS_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch journey templates',
        details: error
      }
    };
  }
}

// Collections Operations
export async function getCollections(
  resourceId: string
): Promise<ApiResponse<ResourceCollection[]>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(resourceId)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const resource = await collection.findOne(
      { _id: new ObjectId(resourceId), resourceType: 'Jesus' },
      { projection: { collections: 1 } }
    );

    if (!resource) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Jesus resource with id ${resourceId} not found`
        }
      };
    }

    return {
      success: true,
      data: (resource as any).collections || []
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'COLLECTIONS_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch collections',
        details: error
      }
    };
  }
}

export async function getCollectionById(
  resourceId: string,
  collectionId: string
): Promise<ApiResponse<ResourceCollection>> {
  try {
    const collection = getResourcesCollection();
    
    if (!ObjectId.isValid(resourceId)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid resource ID format'
        }
      };
    }

    const resource = await collection.findOne(
      { 
        _id: new ObjectId(resourceId), 
        resourceType: 'Jesus',
        'collections.collectionId': collectionId
      },
      { projection: { collections: { $elemMatch: { collectionId } } } }
    );

    if (!resource || !(resource as any).collections || (resource as any).collections.length === 0) {
      return {
        success: false,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection '${collectionId}' not found in resource ${resourceId}`
        }
      };
    }

    return {
      success: true,
      data: (resource as any).collections[0]
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'COLLECTION_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch collection',
        details: error
      }
    };
  }
}
