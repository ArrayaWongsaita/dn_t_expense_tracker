export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}
