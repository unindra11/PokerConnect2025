
export interface User {
  name: string;
  avatar: string;
  handle: string;
}

export interface Post {
  id: string;
  user: User;
  content: string;
  image?: string;
  imageAiHint?: string;
  likes: number;
  likedByCurrentUser?: boolean; // Added to track if current user liked this
  comments: number;
  commentTexts?: string[]; // To store actual comment strings
  shares: number;
  timestamp: string;
}
