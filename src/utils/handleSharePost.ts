import { getFirestore, doc, updateDoc, increment, addDoc, collection, serverTimestamp, getDoc } from "firebase/firestore";
import { app, auth } from "@/lib/firebase"; // Import auth to check the current user
import type { Post, User } from "@/types/post";

interface SharePostParams {
  postId: string;
  caption: string;
  currentUser: any; // Firebase User object
  loggedInUserDetails: any; // User details from UserContext
  posts: Post[];
}

interface SharePostResult {
  updatedPosts?: Post[];
  error?: string;
}

export async function handleSharePost({ postId, caption, currentUser, loggedInUserDetails, posts }: SharePostParams): Promise<SharePostResult> {
  if (!currentUser) {
    return { error: "You must be logged in to share a post." };
  }
  if (!loggedInUserDetails) {
    return { error: "User details not loaded. Please try again." };
  }
  if (!caption || !caption.trim()) {
    return { error: "Caption cannot be empty when sharing a post." };
  }
  if (!postId || typeof postId !== "string") {
    console.error(`handleSharePost: Invalid postId provided: ${postId}`);
    return { error: "Invalid post ID. Cannot share the post." };
  }

  // Debug: Verify the authenticated user
  const authUser = auth.currentUser;
  console.log("handleSharePost: Provided currentUser.uid:", currentUser.uid);
  console.log("handleSharePost: Actual auth.currentUser.uid:", authUser?.uid);
  if (!authUser || authUser.uid !== currentUser.uid) {
    console.error("handleSharePost: Authentication mismatch or user not authenticated");
    return { error: "Authentication error: User session mismatch or not authenticated." };
  }

  console.log(`handleSharePost: Attempting to share post with postId: ${postId}`);

  const db = getFirestore(app, "poker");
  // Fetch the original post directly from Firestore
  const originalPostRef = doc(db, "posts", postId);
  const originalPostSnap = await getDoc(originalPostRef);
  if (!originalPostSnap.exists()) {
    console.error(`handleSharePost: Original post not found in Firestore for postId: ${postId}`);
    return { error: "Original post not found in Firestore." };
  }
  const originalPostData = originalPostSnap.data();
  const originalPost: Post = {
    id: originalPostSnap.id,
    userId: originalPostData.userId,
    user: originalPostData.user,
    content: originalPostData.content,
    image: originalPostData.image || null,
    imageAiHint: originalPostData.imageAiHint || null,
    likes: originalPostData.likes || 0,
    comments: originalPostData.comments || 0,
    shares: originalPostData.shares || 0,
    createdAt: originalPostData.createdAt,
    fetchedComments: [],
    originalPostId: originalPostData.originalPostId,
  };

  console.log(`handleSharePost: Original post data fetched from Firestore for postId ${postId}:`, originalPost);

  try {
    // Step 1: Create the new shared post
    const loggedInUserForPost: User = {
      name: loggedInUserDetails.fullName || loggedInUserDetails.username || "Anonymous",
      avatar: loggedInUserDetails.avatar || `https://placehold.co/100x100.png?text=${(loggedInUserDetails.username || "A").substring(0,1).toUpperCase()}`,
      handle: loggedInUserDetails.username ? `@${loggedInUserDetails.username}` : `@${currentUser.uid}`
    };

    const newPostData: Partial<Post> = {
      userId: currentUser.uid,
      user: loggedInUserForPost,
      content: caption.trim(),
      image: null,
      imageAiHint: null,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: serverTimestamp(),
      originalPostId: postId,
    };

    console.log(`handleSharePost: Data to be sent to Firestore for new shared post:`, {
      ...newPostData,
      createdAt: "serverTimestamp()",
      updatedAt: "serverTimestamp()",
    });

    const newPostRef = await addDoc(collection(db, "posts"), {
      ...newPostData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Step 2: Increment the shares count of the original post
    await updateDoc(originalPostRef, { shares: increment(1) });

    // Step 3: Create a notification for the original post owner (if not the same user)
    console.log(`handleSharePost: Comparing sharer UID (${currentUser.uid}) with original post owner UID (${originalPost.userId})`);
    if (currentUser.uid !== originalPost.userId) {
      const notificationRef = collection(db, "users", originalPost.userId, "notifications");
      const notificationData = {
        type: "share_post",
        senderId: currentUser.uid,
        senderUsername: loggedInUserDetails.username || "Anonymous",
        senderAvatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "A").substring(0,1).toUpperCase()}`,
        postId: postId,
        caption: caption.trim(),
        createdAt: serverTimestamp(),
        read: false,
      };
      console.log(`handleSharePost: Creating share_post notification for user ${originalPost.userId} from ${currentUser.uid}`, notificationData);
      const notificationDocRef = await addDoc(notificationRef, notificationData);
      console.log(`handleSharePost: Successfully created share_post notification with ID ${notificationDocRef.id}`);
    } else {
      console.log(`handleSharePost: Skipping notification creation because sharer (${currentUser.uid}) is the same as the original post owner (${originalPost.userId})`);
    }

    // Step 4: Update the local state
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        return { ...p, shares: (p.shares || 0) + 1 };
      }
      return p;
    });

    // Add the new shared post to the list
    const newPostForUI: Post = {
      ...newPostData,
      id: newPostRef.id,
      timestamp: new Date().toLocaleString(),
      createdAt: new Date(),
      fetchedComments: [],
      likedByCurrentUser: false,
      originalPost: { ...originalPost, fetchedComments: undefined },
    } as Post;

    return { updatedPosts: [newPostForUI, ...updatedPosts] };
  } catch (error: any) {
    console.error("handleSharePost: Error sharing post:", error);
    return { error: `Failed to share post: ${error.message}` };
  }
}