import { getFirestore, collection, query, where, getDocs, doc, updateDoc, increment, writeBatch, serverTimestamp, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import type { Post } from "@/types/post";

interface HandleLikePostParams {
  postId: string;
  currentUser: any; // FirebaseUser | null
  posts: Post[];
}

interface HandleLikePostResult {
  updatedPosts?: Post[];
  error?: string;
}

export async function handleLikePost({ postId, currentUser, posts }: HandleLikePostParams): Promise<HandleLikePostResult> {
  if (!currentUser) {
    return { error: "You must be logged in to like a post." };
  }

  const db = getFirestore(app, "poker");
  const originalPosts = posts.map(p => ({ ...p, fetchedComments: p.fetchedComments ? [...p.fetchedComments] : [] }));

  // Optimistic update
  const updatedPosts = posts.map(p => {
    if (p.id === postId) {
      const isCurrentlyLiked = !!p.likedByCurrentUser;
      const newLikedByCurrentUser = !isCurrentlyLiked;
      const newLikesCount = newLikedByCurrentUser
        ? Math.max(0, (p.likes || 0) + 1)
        : Math.max(0, (p.likes || 0) - 1);

      return {
        ...p,
        likes: newLikesCount,
        likedByCurrentUser: newLikedByCurrentUser,
      };
    }
    return p;
  });

  try {
    const likesCollectionRef = collection(db, "likes");
    const postDocRef = doc(db, "posts", postId);
    const likeQuery = query(likesCollectionRef, where("postId", "==", postId), where("userId", "==", currentUser.uid));
    const likeSnapshot = await getDocs(likeQuery);
    const batch = writeBatch(db);

    // Fetch the post to get the owner's UID and user details for the notification
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }
    const postData = postSnap.data();
    const postOwnerId = postData.userId; // Use userId field as per Post type
    const postUser = postData.user || { name: "Unknown User", avatar: `https://placehold.co/100x100.png?text=U`, handle: "@unknown" };
    const senderUsername = postUser.handle ? postUser.handle.replace(/^@/, '') : (postUser.name || "unknown");

    if (likeSnapshot.empty) {
      // Like the post
      const newLikeRef = doc(likesCollectionRef);
      batch.set(newLikeRef, { postId: postId, userId: currentUser.uid, createdAt: serverTimestamp() });
      batch.update(postDocRef, { likes: increment(1) });

      // Create a notification for the post owner (if the liker is not the owner)
      if (currentUser.uid !== postOwnerId) {
        const notificationRef = collection(db, "users", postOwnerId, "notifications");
        const notificationData = {
          type: "like_post",
          senderId: currentUser.uid,
          senderUsername: senderUsername || "Anonymous",
          senderAvatar: postUser.avatar || `https://placehold.co/40x40.png?text=${(senderUsername || "A").substring(0,1)}`,
          postId: postId,
          createdAt: serverTimestamp(),
          read: false,
        };
        const notificationDocRef = doc(notificationRef);
        batch.set(notificationDocRef, notificationData);
        console.log(`handleLikePost: Created like notification for user ${postOwnerId} on post ${postId}`);
      }

      await batch.commit();
    } else {
      // Unlike the post
      likeSnapshot.forEach(doc => batch.delete(doc.ref));
      batch.update(postDocRef, { likes: increment(-1) });
      await batch.commit();
    }

    return { updatedPosts };
  } catch (error: any) {
    console.error("handleLikePost: Error updating likes in Firestore:", error);
    return { updatedPosts: originalPosts, error: "Could not save your like to Firestore." };
  }
}