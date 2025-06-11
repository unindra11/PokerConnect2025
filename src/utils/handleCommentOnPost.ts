import { getFirestore, collection, doc, updateDoc, increment, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { app, auth } from "@/lib/firebase"; // Import auth to check the current user
import type { Post, Comment as PostComment } from "@/types/post";

interface HandleCommentOnPostParams {
  postId: string;
  commentText: string;
  currentUser: any; // FirebaseUser | null
  loggedInUserDetails: any; // User details from useUser
  posts: Post[];
}

interface HandleCommentOnPostResult {
  updatedPosts?: Post[];
  error?: string;
}

export async function handleCommentOnPost({ postId, commentText, currentUser, loggedInUserDetails, posts }: HandleCommentOnPostParams): Promise<HandleCommentOnPostResult> {
  if (!currentUser) {
    return { error: "You must be logged in to comment." };
  }

  if (!loggedInUserDetails) {
    return { error: "Could not retrieve your profile details to comment." };
  }

  // Debug: Verify the authenticated user
  const authUser = auth.currentUser;
  console.log("handleCommentOnPost: Provided currentUser.uid:", currentUser.uid);
  console.log("handleCommentOnPost: Actual auth.currentUser.uid:", authUser?.uid);
  if (!authUser || authUser.uid !== currentUser.uid) {
    console.error("handleCommentOnPost: Authentication mismatch or user not authenticated");
    return { error: "Authentication error: User session mismatch or not authenticated." };
  }

  const db = getFirestore(app, "poker");
  const postRef = doc(db, "posts", postId);
  const commentsCollectionRef = collection(db, "posts", postId, "comments");

  const newCommentData: Omit<PostComment, 'id'> = {
    userId: currentUser.uid,
    username: loggedInUserDetails.username || "Anonymous",
    avatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "A").substring(0,1)}`,
    text: commentText,
    createdAt: serverTimestamp(),
  };
  console.log("handleCommentOnPost: New comment data:", newCommentData);

  try {
    // Fetch the post to get the owner's UID
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }
    const postData = postSnap.data();
    const postOwnerId = postData.userId; // Use userId field as per Post type

    // Add the comment
    const commentDocRef = await addDoc(commentsCollectionRef, newCommentData);
    console.log("handleCommentOnPost: Comment added with ID:", commentDocRef.id);

    await updateDoc(postRef, { comments: increment(1) });
    console.log("handleCommentOnPost: Updated comments count for post:", postId);

    // Create a notification for the post owner (if the commenter is not the owner)
    if (currentUser.uid !== postOwnerId) {
      const notificationRef = collection(db, "users", postOwnerId, "notifications");
      const notificationData = {
        type: "comment_post",
        senderId: currentUser.uid,
        senderUsername: loggedInUserDetails.username || "Anonymous",
        senderAvatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "A").substring(0,1)}`,
        postId: postId,
        commentText: commentText,
        createdAt: serverTimestamp(),
        read: false,
      };
      console.log("handleCommentOnPost: Creating notification for post owner:", notificationData);
      await addDoc(notificationRef, notificationData);
      console.log(`handleCommentOnPost: Created notification for user ${postOwnerId} about comment on post ${postId}`);
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
          fetchedComments: [...(p.fetchedComments || []), newCommentForUI].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        };
      }
      return p;
    });

    return { updatedPosts };
  } catch (error: any) {
    console.error("handleCommentOnPost: Error adding comment to Firestore:", error);
    return { updatedPosts: posts, error: "Could not save your comment to Firestore." };
  }
}