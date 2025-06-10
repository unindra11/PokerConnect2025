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
  id: string;
  userId: string;
  user: User;
  username?: string;
  content: string;
  image?: string;
  imageAiHint?: string;
  likes: number;
  likedByCurrentUser: boolean;
  comments: number;
  fetchedComments?: Comment[];
  shares: number;
  createdAt: any; // Firestore Timestamp
  timestamp: string;
  originalPostId?: string; // ID of the original post if this is a reshare
  originalPost?: Post | null; // The original post data if this is a reshare
}