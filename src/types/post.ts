
import type { Timestamp } from "firebase/firestore";

export interface User {
  name: string;
  avatar: string;
  handle: string; // Corresponds to username
}

export interface Post {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth UID of the author
  user: User; // Contains displayName, avatar, username for display
  content: string;
  image?: string; // URL from Firebase Storage
  imageAiHint?: string;
  likes: number;
  likedByCurrentUser?: boolean; // Client-side state
  comments: number;
  commentTexts?: string[];
  shares: number;
  createdAt: Timestamp | Date | any; // Firestore Timestamp, or Date for localStorage mock
  // For Firestore, this will be a serverTimestamp, for localStorage, a Date string.
  // 'any' is used for broader compatibility during transition.
}
