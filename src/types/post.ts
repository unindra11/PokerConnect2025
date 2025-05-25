
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
  comments: number;
  shares: number;
  timestamp: string;
}
