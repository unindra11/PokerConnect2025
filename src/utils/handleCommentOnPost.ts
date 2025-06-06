import { getFirestore, doc, collection, addDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";
import type { Post, Comment as PostComment } from "@/types/post";

interface HandleCommentOnPostInput {
  postId: string;
  commentText: string;
  currentUser: any; // Firebase User
  posts: Post[];
}

interface HandleCommentOnPostOutput {
  updatedPosts: Post[] | null;
}

export const handleCommentOnPost = async ({ postId, commentText, currentUser, posts }: HandleCommentOnPostInput): Promise<HandleCommentOnPostOutput> => {
  const db = getFirestore(app, "poker");

  if (!currentUser) {
    return { updatedPosts: null };
  }

  const loggedInUserString = localStorage.getItem("loggedInUser");
  if (!loggedInUserString) {
    return { updatedPosts: null };
  }
  const loggedInUserDetails = JSON.parse(loggedInUserString);

  const postRef = doc(db, "posts", postId);
  const commentsCollectionRef = collection(db, "posts", postId, "comments");

  const newCommentData: Omit<PostComment, 'id'> = {
    userId: currentUser.uid,
    username: loggedInUserDetails.username || "Anonymous",
    avatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "A").substring(0,1)}`,
    text: commentText,
    createdAt: serverTimestamp(),
  };

  try {
    const commentDocRef = await addDoc(commentsCollectionRef, newCommentData);
    await updateDoc(postRef, { comments: increment(1) });
    // Add notification for post owner
    const post = posts.find(p => p.id === postId);
    if (post && post.userId !== currentUser.uid) {
      await addDoc(collection(db, `users/${post.userId}/notifications`), {
        type: "comment_post",
        senderId: currentUser.uid,
        senderUsername: loggedInUserDetails.username || "Anonymous", // Add senderUsername
        postId,
        commentText,
        createdAt: serverTimestamp(),
        read: false,
      });
    }

    const newCommentForUI: PostComment = {
      ...newCommentData,
      id: commentDocRef.id,
      createdAt: new Date(),
    };

    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: (p.comments || 0) + 1,
          fetchedComments: [...(p.fetchedComments || []), newCommentForUI],
        };
      }
      return p;
    });

    return { updatedPosts };
  } catch (error) {
    console.error("Error adding comment to Firestore:", error);
    return { updatedPosts: null };
  }
};