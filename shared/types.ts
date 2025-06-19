// Shared TypeScript types for the Article Saver application

export interface Article {
    id: string;
    url: string;
    title?: string;
    content?: string;
    excerpt?: string;
    author?: string;
    publishedDate?: string;
    tags: string[];
    isRead: boolean;
    isArchived: boolean;
    savedAt: string;  // When the article was originally saved (in Pocket or Article Saver)
    createdAt: string;
    updatedAt: string;
    syncedAt?: string;
}

export interface User {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface SyncQueueItem {
    id: number;
    operation: 'create' | 'update' | 'delete';
    tableName: string;
    recordId: string;
    data?: any;
    createdAt: string;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    fontFamily: string;
    autoSync: boolean;
    apiUrl?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// API Request/Response types
export interface SaveArticleRequest {
    url: string;
    tags?: string[];
}

export interface UpdateArticleRequest {
    title?: string;
    tags?: string[];
    isRead?: boolean;
    isArchived?: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: User;
    tokens: AuthTokens;
}
