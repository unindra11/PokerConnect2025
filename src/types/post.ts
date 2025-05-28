
import type { Timestamp } from "firebase/firestore";

export interface User {
  name: string; // Typically fullName or displayName
  avatar: string;
  handle: string; // Corresponds to username @username
}

export interface Comment {
  id: string; // Firestore document ID of the comment
  userId: string; // UID of the user who made the comment
  username: string; // Username of the commenter
  avatar?: string; // Avatar of the commenter
  text: string;
  createdAt: Timestamp | any; // Firestore Timestamp
}

export interface Post {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth UID of the author
  user: User; // Contains name, avatar, handle for display
  content: string;
  image?: string; // URL from Firebase Storage
  imageAiHint?: string | null;
  likes: number;
  likedByCurrentUser?: boolean; // Client-side state, determined by querying 'likes' collection
  comments: number; // Denormalized count
  fetchedComments?: Comment[]; // Populated by parent component after fetching from 'comments' subcollection
  shares: number;
  createdAt: Timestamp | any; 
  updatedAt?: Timestamp | any;
  // Deprecated, use fetchedComments instead
  commentTexts?: string[];
}
