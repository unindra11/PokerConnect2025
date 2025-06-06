import { getFirestore, doc, collection, query, where, getDocs, writeBatch, serverTimestamp, increment } from "firebase/firestore";
import { app } from "@/lib/firebase";
import type { Post } from "@/types/post";

interface HandleLikePostInput {
  postId: string;
  currentUser: any; // Firebase User
  posts: Post[];
}

interface HandleLikePostOutput {
  updatedPosts: Post[] | null;
}

export const handleLikePost = async ({ postId, currentUser, posts }: HandleLikePostInput): Promise<HandleLikePostOutput> => {
  const db = getFirestore(app, "poker");

  if (!currentUser) {
    return { updatedPosts: null };
  }

  const loggedInUserString = localStorage.getItem("loggedInUser");
  if (!loggedInUserString) {
    return { updatedPosts: null };
  }
  const loggedInUserDetails = JSON.parse(loggedInUserString);

  const originalPosts = posts.map(p => ({ ...p, fetchedComments: p.fetchedComments ? [...p.fetchedComments] : [] }));
  let isCurrentlyLikedOptimistic = false;

  const updatedPosts = posts.map(p => {
    if (p.id === postId) {
      isCurrentlyLikedOptimistic = !!p.likedByCurrentUser;
      const newLikedByCurrentUser = !isCurrentlyLikedOptimistic;
      let newLikesCount = p.likes || 0;
      if (newLikedByCurrentUser) {
        newLikesCount = (p.likes || 0) + 1;
      } else {
        newLikesCount = Math.max(0, (p.likes || 0) - 1);
      }
      return { ...p, likes: newLikesCount, likedByCurrentUser: newLikedByCurrentUser };
    }
    return p;
  });

  try {
    const postRef = doc(db, "posts", postId);
    const likesCollectionRef = collection(db, "likes");
    const likeQuery = query(likesCollectionRef, where("postId", "==", postId), where("userId", "==", currentUser.uid));
    const likeSnapshot = await getDocs(likeQuery);
    const batch = writeBatch(db);

    if (likeSnapshot.empty) { // User is liking
      const newLikeRef = doc(likesCollectionRef);
      batch.set(newLikeRef, { postId, userId: currentUser.uid, createdAt: serverTimestamp() });
      batch.update(postRef, { likes: increment(1) });
      // Add notification for post owner
      const post = posts.find(p => p.id === postId);
      if (post && post.userId !== currentUser.uid) {
        const notificationRef = doc(collection(db, `users/${post.userId}/notifications`));
        batch.set(notificationRef, {
          type: "like_post",
          senderId: currentUser.uid,
          senderUsername: loggedInUserDetails.username || "Anonymous", // Add senderUsername
          postId,
          createdAt: serverTimestamp(),
          read: false,
        });
      }
    } else { // User is unliking
      likeSnapshot.forEach(doc => batch.delete(doc.ref));
      batch.update(postRef, { likes: increment(-1) });
    }

    await batch.commit();
    return { updatedPosts };
  } catch (error) {
    console.error("Error updating like in Firestore:", error);
    return { updatedPosts: originalPosts };
  }
};