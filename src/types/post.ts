
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
  likedByCurrentUser?: boolean;
  comments: number;
  commentTexts?: string[]; // Ensure this is present
  shares: number;
  timestamp: string;
}
