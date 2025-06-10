'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, getDocs, getDoc, onSnapshot, writeBatch, serverTimestamp, increment, limit, getFirestore, setDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Users, MessageCircle, UserMinus, UserPlus, Check, X, Clock } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/UserContext";
import Link from "next/link";

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const router = useRouter();
  const { toast } = useToast();

  const { currentUserAuth, loggedInUserDetails, isLoadingAuth, isLoadingUserDetails } = useUser();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState<"not_friends" | "friends" | "pending_sent" | "pending_received">("not_friends");
  const [posts, setPosts] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authTimeout, setAuthTimeout] = useState(false);

  const db = getFirestore(app, "poker");

  useEffect(() => {
    console.log('UserProfilePage: Checking authentication state', { isLoadingAuth, currentUserAuth });
    if (!isLoadingAuth && !currentUserAuth) {
      console.log('UserProfilePage: Redirecting to /login due to no currentUserAuth');
      router.push("/login");
    }
  }, [isLoadingAuth, currentUserAuth, router]);

  useEffect(() => {
    if (isLoadingAuth || isLoadingUserDetails) {
      const timeout = setTimeout(() => {
        console.log('UserProfilePage: Authentication or user details loading timed out');
        setAuthTimeout(true);
        setError('Loading user data took too long. Please try refreshing the page.');
        setIsLoadingProfile(false);
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [isLoadingAuth, isLoadingUserDetails]);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfileUser() {
      console.log('fetchProfileUser: Starting fetch at', new Date().toISOString());
      console.log('fetchProfileUser: Current state', { username, currentUserAuth, loggedInUserDetails });
      setIsLoadingProfile(true);
      setError(null);

      if (!username) {
        console.log('fetchProfileUser: username is missing');
        if (isMounted) {
          setError('Username is missing');
          setIsLoadingProfile(false);
        }
        return;
      }

      if (!currentUserAuth) {
        console.log('fetchProfileUser: currentUserAuth is null');
        if (isMounted) {
          setError('User not authenticated');
          setIsLoadingProfile(false);
        }
        return;
      }

      try {
        if (loggedInUserDetails?.username === username) {
          console.log('fetchProfileUser: Using loggedInUserDetails for own profile', loggedInUserDetails);
          if (isMounted) {
            setProfileUser({
              uid: loggedInUserDetails.uid,
              username: loggedInUserDetails.username,
              fullName: loggedInUserDetails.fullName || '',
              bio: loggedInUserDetails.bio || '',
              avatar: loggedInUserDetails.avatar || '',
              location: loggedInUserDetails.location || '',
            });
            setIsLoadingProfile(false);
          }
          return;
        }

        console.log('fetchProfileUser: Fetching profile for username:', username);
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '==', username.toLowerCase())
        );
        console.log('fetchProfileUser: Executing query for username:', username.toLowerCase());
        const querySnapshot = await getDocs(usersQuery);
        console.log('fetchProfileUser: Query snapshot size:', querySnapshot.size);
        console.log('fetchProfileUser: Query snapshot docs:', querySnapshot.docs.map(doc => doc.data()));

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data() as User;
          userData.uid = querySnapshot.docs[0].id;
          console.log('fetchProfileUser: Found user by username query:', userData);
          if (isMounted) {
            setProfileUser(userData);
            setIsLoadingProfile(false);
          }
        } else {
          console.log('fetchProfileUser: No user found with username:', username.toLowerCase());
          if (isMounted) {
            setError('User not found');
            router.push('/404');
          }
        }
      } catch (error) {
        console.error('fetchProfileUser: Error fetching user:', error);
        if (isMounted) {
          setError('Could not load user profile: ' + (error.message || 'Unknown error'));
          toast({ 
            title: "Error", 
            description: "Could not load user profile.", 
            variant: "destructive" 
          });
        }
      } finally {
        if (isMounted) {
          console.log('fetchProfileUser: Finally block reached, setting isLoadingProfile to false');
          setIsLoadingProfile(false);
        }
      }
    }

    if (!isLoadingAuth && !isLoadingUserDetails && currentUserAuth) {
      console.log('fetchProfileUser: Triggering fetchProfileUser');
      fetchProfileUser();
    } else {
      console.log('fetchProfileUser: Skipping fetch due to loading auth, user details, or no currentUserAuth', { isLoadingAuth, isLoadingUserDetails, currentUserAuth });
      if (isMounted && !isLoadingAuth && !currentUserAuth) {
        setError('Authentication required');
        setIsLoadingProfile(false);
      }
    }

    return () => {
      isMounted = false;
      console.log('fetchProfileUser: Cleanup - Component unmounted');
    };
  }, [username, currentUserAuth, loggedInUserDetails, router, toast, isLoadingAuth, isLoadingUserDetails, db]);

  useEffect(() => {
    if (profileUser && loggedInUserDetails && profileUser.uid === loggedInUserDetails.uid) {
      console.log('UserProfilePage: Syncing profileUser with loggedInUserDetails:', loggedInUserDetails);
      setProfileUser({
        uid: loggedInUserDetails.uid,
        username: loggedInUserDetails.username,
        fullName: loggedInUserDetails.fullName || '',
        bio: loggedInUserDetails.bio || '',
        avatar: loggedInUserDetails.avatar || '',
        location: loggedInUserDetails.location || '',
      });
    }
  }, [loggedInUserDetails, profileUser]);

  useEffect(() => {
    if (!profileUser) return;

    console.log('UserProfilePage: Setting up posts listener for user:', profileUser);
    console.log('UserProfilePage: Querying posts with userId:', profileUser.uid);
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', profileUser.uid),
      limit(10)
    );

    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      console.log('Posts query snapshot size:', snapshot.size);
      console.log('Posts query snapshot docs:', snapshot.docs.map(postDoc => ({ id: postDoc.id, data: postDoc.data() })));
      if (snapshot.empty) {
        console.log('UserProfilePage: No posts found for userId:', profileUser.uid);
        setPosts([]);
        return;
      }

      try {
        const postsDataPromises = snapshot.docs.map(async (postDoc) => {
          const postData = postDoc.data();
          console.log('Processing post ID:', postDoc.id, 'data:', postData);

          // Validate postData.userId
          if (!postData.userId || typeof postData.userId !== 'string') {
            console.error('Invalid userId in post data:', postData);
            return {
              id: postDoc.id,
              ...postData,
              user: {
                name: 'Unknown User',
                username: 'unknown',
                handle: '@unknown',
                avatar: '',
              },
              likedByCurrentUser: false,
              fetchedComments: [],
            };
          }

          // Fetch user data for the post author
          const userRef = doc(db, 'users', postData.userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : null;
          console.log('Fetched user data for post author:', userData);

          // Check if the current user liked this post
          let likedByCurrentUser = false;
          if (currentUserAuth) {
            const likeRef = doc(db, 'likes', `${currentUserAuth.uid}_${postDoc.id}`);
            const likeSnap = await getDoc(likeRef);
            likedByCurrentUser = likeSnap.exists();
            console.log('Liked by current user:', likedByCurrentUser);
          }

          // Fetch comments for the post
          const commentsQuery = query(
            collection(db, 'posts', postDoc.id, 'comments'),
            limit(5)
          );
          const commentsSnap = await getDocs(commentsQuery);
          const fetchedComments = commentsSnap.docs.map(commentDoc => ({
            id: commentDoc.id,
            ...commentDoc.data(),
          }));
          console.log('Fetched comments for post:', fetchedComments);

          return {
            id: postDoc.id,
            ...postData,
            user: userData
              ? {
                  name: userData.fullName || userData.username,
                  username: userData.username,
                  handle: `@${userData.username}`,
                  avatar: userData.avatar || '',
                }
              : {
                  name: 'Unknown User',
                  username: 'unknown',
                  handle: '@unknown',
                  avatar: '',
                },
            likedByCurrentUser,
            fetchedComments,
          };
        });

        const postsData = await Promise.all(postsDataPromises);
        console.log('UserProfilePage: Fetched posts:', postsData);
        setPosts(postsData);
      } catch (error) {
        console.error('UserProfilePage: Error processing posts snapshot:', error);
        toast({ 
          title: "Error", 
          description: "Could not load posts. Please try again: " + error.message,
          variant: "destructive" 
        });
        setPosts([]);
      }
    }, (error) => {
      console.error('UserProfilePage: Error fetching posts:', error);
      toast({ 
        title: "Error", 
        description: "Could not load posts: " + error.message,
        variant: "destructive" 
      });
      setPosts([]);
    });

    return () => {
      console.log('UserProfilePage: Cleaning up posts listener');
      unsubscribe();
    };
  }, [profileUser, currentUserAuth, toast, db]);

  useEffect(() => {
    if (!profileUser || !currentUserAuth) return;

    if (currentUserAuth.uid !== profileUser.uid && relationshipStatus !== 'friends') {
      console.log('UserProfilePage: Skipping friends fetch due to lack of permission', {
        currentUserUid: currentUserAuth.uid,
        profileUserUid: profileUser.uid,
        relationshipStatus,
      });
      setFriends([]);
      return;
    }

    console.log('UserProfilePage: Fetching friends for user:', profileUser.uid);
    const friendsCollection = collection(db, 'users', profileUser.uid, 'friends');
    const unsubscribe = onSnapshot(friendsCollection, (snapshot) => {
      try {
        const friendsData = snapshot.docs.map((doc) => doc.data());
        console.log('UserProfilePage: Fetched friends:', friendsData);
        setFriends(friendsData);
      } catch (error) {
        console.error('UserProfilePage: Error processing friends snapshot:', error);
        toast({ 
          title: "Error", 
          description: "Could not load friends list.",
          variant: "destructive" 
        });
      }
    }, (error) => {
      console.error('UserProfilePage: Permission denied accessing friends:', error);
      toast({ 
        title: "Error", 
        description: "Could not load friends list.",
        variant: "destructive" 
      });
    });

    return () => {
      console.log('UserProfilePage: Cleaning up friends listener');
      unsubscribe();
    };
  }, [profileUser, currentUserAuth, relationshipStatus, toast, db]);

  useEffect(() => {
    if (!currentUserAuth || !profileUser) return;

    const checkRelationship = async () => {
      console.log('Checking relationship between', currentUserAuth.uid, 'and', profileUser.uid);
      const friendsQuery = query(
        collection(db, 'users', currentUserAuth.uid, 'friends'),
        where('friendUserId', '==', profileUser.uid)
      );

      const unsubscribeFriends = onSnapshot(friendsQuery, async (snapshot) => {
        try {
          console.log(
            `Friends query snapshot for ${currentUserAuth.uid}:`,
            snapshot.docs.map(doc => doc.data())
          );
          if (!snapshot.empty) {
            console.log('Users are friends. Setting relationshipStatus to "friends"');
            setRelationshipStatus('friends');
            return;
          }

          console.log('No friendship found. Checking for pending friend requests...');
          const sentRequestId = `${currentUserAuth.uid}_${profileUser.uid}`;
          const sentRequestRef = doc(db, 'friendRequests', sentRequestId);
          const sentDoc = await getDoc(sentRequestRef);
          if (sentDoc.exists() && sentDoc.data().status === 'pending') {
            console.log('Found a pending sent request:', sentDoc.data());
            setRelationshipStatus('pending_sent');
            return;
          }

          const receivedRequestId = `${profileUser.uid}_${currentUserAuth.uid}`;
          const receivedRequestRef = doc(db, 'friendRequests', receivedRequestId);
          const receivedDoc = await getDoc(receivedRequestRef);
          if (receivedDoc.exists() && receivedDoc.data().status === 'pending') {
            console.log('Found a pending received request:', receivedDoc.data());
            setRelationshipStatus('pending_received');
            return;
          }

          console.log('No relationship found. Setting to not_friends');
          setRelationshipStatus('not_friends');
        } catch (error) {
          console.error('UserProfilePage: Error processing relationship check:', error);
          toast({ 
            title: "Error", 
            description: "Could not load relationship status.",
            variant: "destructive" 
          });
          setRelationshipStatus('not_friends');
        }
      }, (error) => {
        console.error('Error checking friends:', error);
        toast({ 
          title: "Error", 
          description: "Could not load relationship status.",
          variant: "destructive" 
        });
        setRelationshipStatus('not_friends');
      });

      return () => {
        unsubscribeFriends();
        console.log('UserProfilePage: Cleaned up relationship listeners');
      };
    };

    checkRelationship().catch((error) => {
      console.error('UserProfilePage: Failed to check relationship:', error);
      toast({ 
        title: "Error", 
        description: "Could not load relationship status.",
        variant: "destructive" 
      });
      setRelationshipStatus('not_friends');
    });

    return () => {
      console.log('UserProfilePage: Cleaned up relationship check');
    };
  }, [currentUserAuth, profileUser, toast, db]);

  const handleLikePost = async (postId: string) => {
    if (!currentUserAuth || !loggedInUserDetails) {
      toast({ title: "Authentication Error", description: "You must be logged in to like a post.", variant: "destructive" });
      return;
    }

    try {
      console.log('UserProfilePage: Liking post', postId, 'by user', currentUserAuth.uid);
      const likeId = `${currentUserAuth.uid}_${postId}`;
      const likeRef = doc(db, 'likes', likeId);
      const postRef = doc(db, 'posts', postId);

      const likeSnap = await getDoc(likeRef);
      const batch = writeBatch(db);

      if (likeSnap.exists()) {
        batch.delete(likeRef);
        batch.update(postRef, { likes: increment(-1) });
        setPosts(posts.map(post => post.id === postId ? { ...post, likes: (post.likes || 0) - 1, likedByCurrentUser: false } : post));
        toast({ title: "Success", description: "Post unliked." });
        console.log('UserProfilePage: Post unliked successfully');
      } else {
        batch.set(likeRef, {
          userId: currentUserAuth.uid,
          postId: postId,
          createdAt: serverTimestamp(),
        });
        batch.update(postRef, { likes: increment(1) });

        if (profileUser.uid !== currentUserAuth.uid) {
          const notificationRef = doc(collection(db, 'users', profileUser.uid, 'notifications'));
          batch.set(notificationRef, {
            type: 'like_post',
            senderId: currentUserAuth.uid,
            senderUsername: loggedInUserDetails.username || currentUserAuth.email?.split('@')[0],
            senderAvatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "U").substring(0,1)}`,
            postId: postId,
            createdAt: serverTimestamp(),
            read: false,
          });
          console.log('UserProfilePage: Created like_post notification for user', profileUser.uid);
        }

        setPosts(posts.map(post => post.id === postId ? { ...post, likes: (post.likes || 0) + 1, likedByCurrentUser: true } : post));
        toast({ title: "Success", description: "Post liked." });
        console.log('UserProfilePage: Post liked successfully');
      }

      await batch.commit();
    } catch (error) {
      console.error('UserProfilePage: Error liking post:', error);
      toast({ title: "Error", description: "Could not like the post.", variant: "destructive" });
    }
  };

  const handleCommentPost = async (postId: string, commentText: string) => {
    if (!currentUserAuth || !loggedInUserDetails) {
      toast({ title: "Authentication Error", description: "You must be logged in to comment on a post.", variant: "destructive" });
      return;
    }

    try {
      console.log('UserProfilePage: Adding comment to post', postId, 'by user', currentUserAuth.uid);
      const postRef = doc(db, 'posts', postId);
      const commentRef = doc(collection(db, 'posts', postId, 'comments'));
      const batch = writeBatch(db);

      const commentData = {
        userId: currentUserAuth.uid,
        username: loggedInUserDetails.username || currentUserAuth.email?.split('@')[0],
        avatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "U").substring(0,1)}`,
        text: commentText,
        createdAt: serverTimestamp(),
      };

      batch.set(commentRef, commentData);
      batch.update(postRef, { comments: increment(1) });

      if (profileUser.uid !== currentUserAuth.uid) {
        const notificationRef = doc(collection(db, 'users', profileUser.uid, 'notifications'));
        batch.set(notificationRef, {
          type: 'comment_post',
          senderId: currentUserAuth.uid,
          senderUsername: loggedInUserDetails.username || currentUserAuth.email?.split('@')[0],
          senderAvatar: loggedInUserDetails.avatar || `https://placehold.co/40x40.png?text=${(loggedInUserDetails.username || "U").substring(0,1)}`,
          postId: postId,
          commentText: commentText,
          createdAt: serverTimestamp(),
          read: false,
        });
        console.log('UserProfilePage: Created comment_post notification for user', profileUser.uid);
      }

      await batch.commit();

      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: (post.comments || 0) + 1,
            fetchedComments: [
              ...(post.fetchedComments || []),
              { id: commentRef.id, ...commentData },
            ],
          };
        }
        return post;
      }));

      toast({ title: "Comment Added", description: "Your comment has been posted." });
      console.log('UserProfilePage: Comment added successfully');
    } catch (error) {
      console.error('UserProfilePage: Error commenting on post:', error);
      toast({ title: "Error", description: "Could not add your comment.", variant: "destructive" });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUserAuth) {
      toast({ title: "Authentication Error", description: "You must be logged in to delete a post.", variant: "destructive" });
      return;
    }

    try {
      console.log('UserProfilePage: Deleting post', postId);
      const postRef = doc(db, 'posts', postId);
      const batch = writeBatch(db);

      batch.delete(postRef);

      const likesQuery = query(collection(db, 'likes'), where('postId', '==', postId));
      const likesSnap = await getDocs(likesQuery);
      likesSnap.forEach(doc => batch.delete(doc.ref));

      const commentsQuery = query(collection(db, 'posts', postId, 'comments'));
      const commentsSnap = await getDocs(commentsQuery);
      commentsSnap.forEach(doc => batch.delete(doc.ref));

      const notificationsQuery = query(
        collection(db, 'users', profileUser.uid, 'notifications'),
        where('postId', '==', postId)
      );
      const notificationsSnap = await getDocs(notificationsQuery);
      notificationsSnap.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      setPosts(posts.filter(post => post.id !== postId));
      toast({ title: "Post Deleted", description: "The post has been deleted." });
      console.log('UserProfilePage: Post deleted successfully');
    } catch (error) {
      console.error('UserProfilePage: Error deleting post:', error);
      toast({ title: "Error", description: "Could not delete the post.", variant: "destructive" });
    }
  };

  const handleAddFriend = async () => {
    if (!currentUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to send requests.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      console.log('UserProfilePage: Sending friend request from', currentUserAuth.uid, 'to', profileUser.uid);
      console.log('UserProfilePage: Current user auth UID:', currentUserAuth.uid);

      // Fetch sender's data directly from Firestore
      const senderRef = doc(db, "users", currentUserAuth.uid);
      const senderSnap = await getDoc(senderRef);
      if (!senderSnap.exists()) {
        console.error('UserProfilePage: Sender user data not found for UID:', currentUserAuth.uid);
        throw new Error("Sender user data not found in Firestore");
      }
      const senderData = senderSnap.data();
      console.log('UserProfilePage: Sender data fetched:', senderData);

      // Ensure senderUsername and senderAvatar are always defined with fallbacks
      const senderUsername = senderData.username || (currentUserAuth.email?.split('@')[0]) || "UnknownUser";
      const senderAvatar = senderData.avatar || `https://placehold.co/40x40.png?text=${(senderData.username || senderData.email?.charAt(0) || "U").substring(0,1).toUpperCase()}`;
      
      // Log the values to verify
      console.log('UserProfilePage: Sender details for notification:', { senderUsername, senderAvatar });

      const friendRequestId = `${currentUserAuth.uid}_${profileUser.uid}`;
      const requestRef = doc(db, "friendRequests", friendRequestId);
      const requestData = {
        senderId: currentUserAuth.uid,
        receiverId: profileUser.uid,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        senderUsername, // Add senderUsername to requestData for debugging
        senderAvatar,   // Add senderAvatar to requestData for debugging
      };

      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        console.log('UserProfilePage: Friend request already exists:', requestSnap.data());
        toast({ title: "Request Already Sent", description: "You have already sent a friend request to this user.", variant: "default" });
        setRelationshipStatus("pending_sent");
        setIsProcessingAction(false);
        return;
      }

      console.log('UserProfilePage: Writing friend request data:', requestData);
      await setDoc(requestRef, requestData);
      console.log('UserProfilePage: Friend request write succeeded');

      try {
        const notificationRef = doc(collection(db, "users", profileUser.uid, "notifications"));
        const notificationData = {
          type: "friend_request",
          senderId: currentUserAuth.uid,
          senderUsername: senderUsername,
          senderAvatar: senderAvatar,
          createdAt: serverTimestamp(),
          read: false,
        };
        console.log('UserProfilePage: Writing notification data:', notificationData);
        await setDoc(notificationRef, notificationData);
        console.log('UserProfilePage: Notification write succeeded for notification ID:', notificationRef.id);
      } catch (notificationError) {
        console.warn("UserProfilePage: Failed to write notification (friend request still sent):", notificationError);
        toast({ title: "Warning", description: "Friend request sent, but notification could not be delivered.", variant: "default" });
      }

      setRelationshipStatus("pending_sent");
      toast({ title: "Friend Request Sent!", description: `Request sent to ${profileUser.username}.` });
      console.log('UserProfilePage: Friend request sent successfully');
    } catch (error) {
      console.error("UserProfilePage (handleAddFriend): Error sending friend request:", error);
      toast({ title: "Error", description: `Could not send friend request: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!currentUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to cancel requests.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      console.log('UserProfilePage: Cancelling friend request from', currentUserAuth.uid, 'to', profileUser.uid);
      const friendRequestId = `${currentUserAuth.uid}_${profileUser.uid}`;
      const requestRef = doc(db, "friendRequests", friendRequestId);
      const docSnap = await getDoc(requestRef);
      if (docSnap.exists()) {
        const batch = writeBatch(db);
        batch.delete(requestRef);
        const notificationsQuery = query(
          collection(db, "users", profileUser.uid, "notifications"),
          where("senderId", "==", currentUserAuth.uid),
          where("type", "==", "friend_request")
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        notificationsSnapshot.forEach((notificationDoc) => {
          batch.delete(notificationDoc.ref);
        });
        await batch.commit();
      }

      toast({ title: "Friend Request Cancelled", description: `Request to ${profileUser.username} has been cancelled.` });
      setRelationshipStatus("not_friends");
      console.log('UserProfilePage: Friend request cancelled successfully');
    } catch (error) {
      console.error("UserProfilePage (handleCancelFriendRequest): Error cancelling friend request:", error);
      toast({ title: "Error", description: "Could not cancel friend request.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!currentUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to accept requests.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      console.log('UserProfilePage: Accepting friend request from', profileUser.uid, 'to', currentUserAuth.uid);

      // Fetch acceptor's data directly from Firestore
      const acceptorRef = doc(db, "users", currentUserAuth.uid);
      const acceptorSnap = await getDoc(acceptorRef);
      if (!acceptorSnap.exists()) {
        throw new Error("Acceptor user data not found in Firestore");
      }
      const acceptorData = acceptorSnap.data();
      const acceptorUsername = acceptorData.username || currentUserAuth.email?.split('@')[0] || "User";
      const acceptorName = acceptorData.fullName || acceptorUsername;
      const acceptorAvatar = acceptorData.avatar || `https://placehold.co/40x40.png?text=${(acceptorUsername || "U").substring(0,1)}`;

      const friendRequestId = `${profileUser.uid}_${currentUserAuth.uid}`;
      const requestRef = doc(db, "friendRequests", friendRequestId);
      const batch = writeBatch(db);

      const requestUpdateData = { status: "accepted", updatedAt: serverTimestamp() };
      batch.update(requestRef, requestUpdateData);

      const acceptorFriendsRef = doc(db, "users", currentUserAuth.uid, "friends", profileUser.uid);
      const acceptorFriendData = {
        friendUserId: profileUser.uid,
        username: profileUser.username,
        name: profileUser.fullName || profileUser.username,
        avatar: profileUser.avatar || `https://placehold.co/40x40.png?text=${(profileUser.username || "F").substring(0,1)}`,
        since: serverTimestamp()
      };
      batch.set(acceptorFriendsRef, acceptorFriendData);

      const senderFriendsRef = doc(db, "users", profileUser.uid, "friends", currentUserAuth.uid);
      const senderFriendData = {
        friendUserId: currentUserAuth.uid,
        username: acceptorUsername,
        name: acceptorName,
        avatar: acceptorAvatar,
        since: serverTimestamp()
      };
      batch.set(senderFriendsRef, senderFriendData);

      const notificationsQuery = query(
        collection(db, "users", currentUserAuth.uid, "notifications"),
        where("senderId", "==", profileUser.uid),
        where("type", "==", "friend_request")
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.forEach((notificationDoc) => {
        batch.delete(notificationDoc.ref);
      });

      await batch.commit();
      toast({ title: "Friend Request Accepted!", description: `You are now friends with ${profileUser.username}.` });
      console.log('UserProfilePage: Friend request accepted successfully');
    } catch (error) {
      console.error("UserProfilePage (handleAcceptFriendRequest): Error accepting friend request:", error);
      toast({ title: "Error", description: "Could not accept friend request.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!currentUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to decline requests.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      console.log('UserProfilePage: Declining friend request from', profileUser.uid, 'to', currentUserAuth.uid);
      const friendRequestId = `${profileUser.uid}_${currentUserAuth.uid}`;
      const requestRef = doc(db, "friendRequests", friendRequestId);
      const batch = writeBatch(db);

      const requestUpdateData = { status: "declined", updatedAt: serverTimestamp() };
      batch.update(requestRef, requestUpdateData);

      const notificationsQuery = query(
        collection(db, "users", currentUserAuth.uid, "notifications"),
        where("senderId", "==", profileUser.uid),
        where("type", "==", "friend_request")
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.forEach((notificationDoc) => {
        batch.delete(notificationDoc.ref);
      });

      await batch.commit();
      toast({ title: "Friend Request Declined", description: `You have declined the request from ${profileUser.username}.` });
      setRelationshipStatus("not_friends");
      console.log('UserProfilePage: Friend request declined successfully');
    } catch (error) {
      console.error("UserProfilePage (handleDeclineFriendRequest): Error declining friend request:", error);
      toast({ title: "Error", description: "Could not decline friend request.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleUnfriend = async () => {
    if (!currentUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to unfriend users.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      console.log('UserProfilePage: Unfriending user', profileUser.uid, 'by', currentUserAuth.uid);
      const batch = writeBatch(db);

      const currentUserFriendRef = doc(db, "users", currentUserAuth.uid, "friends", profileUser.uid);
      const profileUserFriendRef = doc(db, "users", profileUser.uid, "friends", currentUserAuth.uid);

      batch.delete(currentUserFriendRef);
      batch.delete(profileUserFriendRef);

      const friendRequestId = `${currentUserAuth.uid}_${profileUser.uid}`;
      const reverseFriendRequestId = `${profileUser.uid}_${currentUserAuth.uid}`;
      const friendRequestRef = doc(db, "friendRequests", friendRequestId);
      const reverseFriendRequestRef = doc(db, "friendRequests", reverseFriendRequestId);

      const friendRequestDoc = await getDoc(friendRequestRef);
      if (friendRequestDoc.exists()) {
        batch.delete(friendRequestRef);
      }

      const reverseFriendRequestDoc = await getDoc(reverseFriendRequestRef);
      if (reverseFriendRequestDoc.exists()) {
        batch.delete(reverseFriendRequestRef);
      }

      // Delete any existing chat between the users
      const chatId = [currentUserAuth.uid, profileUser.uid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);
      if (chatDoc.exists()) {
        batch.delete(chatRef);
      }

      await batch.commit();
      toast({ title: "Unfriended", description: `You are no longer friends with ${profileUser.username}.` });
      setRelationshipStatus("not_friends");
      console.log('UserProfilePage: Unfriended successfully');
    } catch (error) {
      console.error("UserProfilePage (handleUnfriend): Error unfriending user:", error);
      toast({ title: "Error", description: "Could not unfriend user.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to send messages.", variant: "destructive" });
      return;
    }

    // Check if the users are friends
    if (relationshipStatus !== "friends") {
      toast({
        title: "Cannot Start Chat",
        description: "You can only chat with friends. Send a friend request to start chatting!",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a unique chat ID by sorting UIDs alphabetically
      const chatId = [currentUserAuth.uid, profileUser.uid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);

      // Check if the chat already exists
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        // Create a new chat document
        const chatData = {
          participants: [currentUserAuth.uid, profileUser.uid],
          lastMessage: {
            text: "Chat started!",
            senderId: currentUserAuth.uid,
            timestamp: serverTimestamp(),
          },
          unreadCounts: {
            [currentUserAuth.uid]: 0,
            [profileUser.uid]: 0,
          },
        };
        await setDoc(chatRef, chatData);
        console.log(`UserProfilePage: Created new chat with ID ${chatId}`);
      }

      // Navigate to the chat page
      router.push(`/chat/${chatId}`);
      toast({
        title: "Starting Chat",
        description: `Opening conversation with ${profileUser.username}.`,
      });
    } catch (error) {
      console.error("UserProfilePage (handleMessage): Error starting chat:", error);
      toast({
        title: "Error",
        description: "Could not start the chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingProfile && !authTimeout) {
    console.log('UserProfilePage: Rendering loading state', { profileUser, isLoadingProfile });
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('UserProfilePage: Rendering error state', { error });
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    console.log('UserProfilePage: Rendering user not found state');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">User not found</p>
        </div>
      </div>
    );
  }

  console.log('UserProfilePage: Rendering profile page', { profileUser });
  const isOwnProfile = currentUserAuth?.uid === profileUser.uid;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg rounded-xl">
          <CardHeader>
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-lg"></div>
          </CardHeader>
          <CardContent className="pt-0 text-center">
            <div className="flex justify-center -mt-12">
              <Avatar className="h-24 w-24 border-4 border-white">
                <AvatarImage src={profileUser.avatar} alt={profileUser.username} />
                <AvatarFallback>{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <CardTitle className="text-xl">{profileUser.fullName || profileUser.username}</CardTitle>
              <p className="text-muted-foreground">@{profileUser.username}</p>
              <div className="mt-2 flex items-center justify-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{profileUser.location || "Unknown location"}</span>
              </div>
              <p className="mt-2 text-sm">{profileUser.bio || "No bio yet."}</p>
            </div>

            {!isOwnProfile && (
              <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
                {relationshipStatus === "not_friends" && (
                  <Button onClick={handleAddFriend} disabled={isProcessingAction}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Friend
                  </Button>
                )}
                {relationshipStatus === "pending_sent" && (
                  <>
                    <Button disabled>
                      <Clock className="mr-2 h-4 w-4" /> Request Sent
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelFriendRequest}
                      disabled={isProcessingAction}
                    >
                      <X className="mr-2 h-4 w-4" /> Cancel Request
                    </Button>
                  </>
                )}
                {relationshipStatus === "pending_received" && (
                  <>
                    <Button onClick={handleAcceptFriendRequest} disabled={isProcessingAction}>
                      <Check className="mr-2 h-4 w-4" /> Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDeclineFriendRequest}
                      disabled={isProcessingAction}
                    >
                      <X className="mr-2 h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
                {relationshipStatus === "friends" && (
                  <div className="flex flex-wrap items-center justify-center space-x-0.5 p-2 border border-gray-200 rounded-lg bg-gray-50 w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-700 hover:bg-green-100"
                      disabled
                    >
                      <Users className="mr-2 h-4 w-4" /> Friends
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-gray-200"
                      onClick={handleMessage}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" /> Message
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-100 text-red-600"
                      onClick={handleUnfriend}
                    >
                      <UserMinus className="mr-2 h-4 w-4" /> Unfriend
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts">
              <Card>
                <CardHeader>
                  <CardTitle>Posts ({posts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <div key={post.id}>
                        <PostCard
                          post={post}
                          currentUserId={currentUserAuth?.uid}
                          showManagementControls={isOwnProfile}
                          onDeletePost={handleDeletePost}
                          onLikePost={handleLikePost}
                          onCommentPost={handleCommentPost}
                        />
                        <Separator className="my-4" />
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      {isOwnProfile ? "You haven't posted yet. Share your first post!" : "No posts yet."}
                      {isOwnProfile && (
                        <Button asChild className="ml-2">
                          <Link href="/create-post">Create Post</Link>
                        </Button>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connections">
              <Card>
                <CardHeader>
                  <CardTitle>Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  {(isOwnProfile || relationshipStatus === 'friends') ? (
                    friends.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {friends.map((friend) => (
                          <div key={friend.friendUserId} className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage src={friend.avatar} alt={friend.username} />
                              <AvatarFallback>{friend.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{friend.name}</p>
                              <p className="text-sm text-muted-foreground">@{friend.username}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No connections yet.</p>
                    )
                  ) : (
                    <p className="text-muted-foreground">Friends list is private.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}