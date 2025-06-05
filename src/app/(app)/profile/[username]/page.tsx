'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getFirestore, collection, query, where, getDoc, doc, setDoc, onSnapshot, serverTimestamp, getDocs, writeBatch, updateDoc, orderBy, limit } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, MessageSquare, UserMinus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const firestore = getFirestore(app, 'poker');
const auth = getAuth(app);

interface User {
  uid: string;
  username: string;
  fullName: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
}

interface LoggedInUserDetails {
  uid: string;
  username: string;
  fullName?: string;
  avatar?: string;
}

interface Post {
  id: string;
  content: string;
  createdAt: any;
  userId: string;
}

interface Friend {
  friendUserId: string;
  username: string;
  avatar?: string;
}

export default function UserProfilePage() {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [currentLoggedInUserAuth, setCurrentLoggedInUserAuth] = useState<LoggedInUserDetails | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState<'not_friends' | 'friends' | 'pending_sent' | 'pending_received'>('not_friends');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [mutualFriends, setMutualFriends] = useState<Friend[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  
  const params = useParams();
  const username = params?.username as string;

  // Check authentication state and fetch logged-in user details from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            const loggedInUser: LoggedInUserDetails = {
              uid: firebaseUser.uid,
              username: userData.username,
              fullName: userData.fullName,
              avatar: userData.avatar,
            };
            setCurrentLoggedInUserAuth(loggedInUser);
          } else {
            console.error('UserProfilePage: Logged-in user not found in Firestore:', firebaseUser.uid);
            toast({ title: "Error", description: "User data not found.", variant: "destructive" });
            router.push('/login');
          }
        } catch (error) {
          console.error('UserProfilePage: Error fetching logged-in user from Firestore:', error);
          toast({ title: "Error", description: "Could not load user data.", variant: "destructive" });
          router.push('/login');
        }
      } else {
        setCurrentLoggedInUserAuth(null);
        router.push('/login');
      }
      setIsLoadingAuth(false);
    }, (error) => {
      console.error('UserProfilePage: Error checking auth state:', error);
      toast({ title: "Authentication Error", description: "Could not verify login status.", variant: "destructive" });
      setIsLoadingAuth(false);
      router.push('/login');
    });

    return () => unsubscribe();
  }, [router, toast]);

  // Fetch the profile user data based on username
  useEffect(() => {
    async function fetchProfileUser() {
      if (!username) return;
      try {
        const usersQuery = query(
          collection(firestore, 'users'),
          where('username', '==', username)
        );
        const querySnapshot = await getDocs(usersQuery);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data() as User;
          setProfileUser(userData);
        } else {
          console.log('UserProfilePage: No user found with username:', username);
          router.push('/404');
        }
      } catch (error) {
        console.error('UserProfilePage: Error fetching user:', error);
        toast({ title: "Error", description: "Could not load user profile.", variant: "destructive" });
        router.push('/404');
      }
    }

    fetchProfileUser();
  }, [username, router, toast]);

  // Fetch posts for the profile user from top-level /posts collection
  useEffect(() => {
    if (!profileUser) return;

    const postsQuery = query(
      collection(firestore, 'posts'),
      where('userId', '==', profileUser.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts: Post[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedPosts.push({
          id: doc.id,
          content: data.content,
          createdAt: data.createdAt,
          userId: data.userId,
        });
      });
      setPosts(fetchedPosts);
    }, (error) => {
      console.error('UserProfilePage: Error fetching posts:', error);
      toast({ title: "Error", description: "Could not load posts.", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [profileUser, toast]);

  // Fetch friends count and mutual friends
  useEffect(() => {
    if (!profileUser || !currentLoggedInUserAuth) return;

    const fetchFriendsData = async () => {
      try {
        // Get profile user's friends
        const profileFriendsQuery = query(
          collection(firestore, 'users', profileUser.uid, 'friends')
        );
        const profileFriendsSnapshot = await getDocs(profileFriendsQuery);
        setFriendsCount(profileFriendsSnapshot.size);

        // Get logged-in user's friends
        const loggedInFriendsQuery = query(
          collection(firestore, 'users', currentLoggedInUserAuth.uid, 'friends')
        );
        const loggedInFriendsSnapshot = await getDocs(loggedInFriendsQuery);

        // Find mutual friends
        const profileFriendsIds = new Set(profileFriendsSnapshot.docs.map(doc => doc.data().friendUserId));
        const mutual: Friend[] = [];
        loggedInFriendsSnapshot.forEach((doc) => {
          const friendData = doc.data() as Friend;
          if (profileFriendsIds.has(friendData.friendUserId)) {
            mutual.push(friendData);
          }
        });
        setMutualFriends(mutual);
      } catch (error) {
        console.error('UserProfilePage: Error fetching friends data:', error);
        toast({ title: "Error", description: "Could not load connections.", variant: "destructive" });
      }
    };

    fetchFriendsData();
  }, [profileUser, currentLoggedInUserAuth, toast]);

  // Check relationship status in real-time
  useEffect(() => {
    if (!currentLoggedInUserAuth || !profileUser) return;

    const checkRelationship = () => {
      const friendsQuery = query(
        collection(firestore, 'users', currentLoggedInUserAuth.uid, 'friends'),
        where('uid', '==', profileUser.uid)
      );

      const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
        console.log(
          `UserProfilePage: Checking if users are friends. Viewer UID: ${currentLoggedInUserAuth.uid}, Profile UID: ${profileUser.uid}`
        );
        if (!snapshot.empty) {
          console.log(
            `UserProfilePage: Users are friends. Viewer UID: ${currentLoggedInUserAuth.uid}, Profile UID: ${profileUser.uid}`
          );
          setRelationshipStatus('friends');
          return;
        }

        const sentRequestQuery = query(
          collection(firestore, 'friendRequests'),
          where('senderId', '==', currentLoggedInUserAuth.uid),
          where('receiverId', '==', profileUser.uid), // Changed recipientId to receiverId
          where('status', '==', 'pending')
        );

        const receivedRequestQuery = query(
          collection(firestore, 'friendRequests'),
          where('senderId', '==', profileUser.uid),
          where('receiverId', '==', currentLoggedInUserAuth.uid), // Changed recipientId to receiverId
          where('status', '==', 'pending')
        );

        const unsubscribeSent = onSnapshot(sentRequestQuery, (sentSnapshot) => {
          if (!sentSnapshot.empty) {
            console.log('UserProfilePage: Found a pending friend request sent by the viewer.');
            setRelationshipStatus('pending_sent');
          } else {
            if (relationshipStatus !== 'friends' && relationshipStatus !== 'pending_received') {
              setRelationshipStatus('not_friends');
            }
          }
        });

        const unsubscribeReceived = onSnapshot(receivedRequestQuery, (receivedSnapshot) => {
          if (!receivedSnapshot.empty) {
            console.log('UserProfilePage: Found a pending friend request received by the viewer.');
            setRelationshipStatus('pending_received');
          } else {
            if (relationshipStatus !== 'friends' && relationshipStatus !== 'pending_sent') {
              setRelationshipStatus('not_friends');
            }
          }
        });

        return () => {
          unsubscribeFriends();
          unsubscribeSent();
          unsubscribeReceived();
        };
      }, (error) => {
        console.error('UserProfilePage: Permission denied accessing friends or friendRequests:', error);
        toast({ title: "Error", description: "Could not load relationship status.", variant: "destructive" });
        setRelationshipStatus('not_friends');
      });
    };

    const unsubscribe = checkRelationship();
    return () => unsubscribe && unsubscribe();
  }, [currentLoggedInUserAuth, profileUser, toast]);

  // Handle sending a friend request
  const handleAddFriend = async () => {
    if (!currentLoggedInUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to add friends.", variant: "destructive" });
      return;
    }

    setIsSendingRequest(true);

    try {
      if (currentLoggedInUserAuth.uid === profileUser.uid) {
        toast({ title: "Cannot Add Self", description: "You cannot send a friend request to yourself.", variant: "default" });
        return;
      }

      const friendDocRef = doc(firestore, 'users', currentLoggedInUserAuth.uid, 'friends', profileUser.uid);
      const friendDocSnap = await getDoc(friendDocRef);
      if (friendDocSnap.exists()) {
        toast({ title: "Already Friends", description: `You are already friends with ${profileUser.username}.`, variant: "default" });
        return;
      }

      const requestQuerySent = query(
        collection(firestore, 'friendRequests'),
        where('senderId', '==', currentLoggedInUserAuth.uid),
        where('receiverId', '==', profileUser.uid), // Changed recipientId to receiverId
        where('status', '==', 'pending')
      );
      const requestQueryReceived = query(
        collection(firestore, 'friendRequests'),
        where('senderId', '==', profileUser.uid),
        where('receiverId', '==', currentLoggedInUserAuth.uid), // Changed recipientId to receiverId
        where('status', '==', 'pending')
      );

      const [requestSnapshotSent, requestSnapshotReceived] = await Promise.all([
        getDocs(requestQuerySent),
        getDocs(requestQueryReceived)
      ]);

      if (!requestSnapshotSent.empty || !requestSnapshotReceived.empty) {
        toast({ title: "Request Already Exists", description: "A friend request is already pending between you and this user.", variant: "default" });
        return;
      }

      const friendRequestId = `${currentLoggedInUserAuth.uid}_${profileUser.uid}`;
      const friendRequestRef = doc(firestore, 'friendRequests', friendRequestId);
      await setDoc(friendRequestRef, {
        senderId: currentLoggedInUserAuth.uid,
        senderUsername: currentLoggedInUserAuth.username,
        senderAvatar: currentLoggedInUserAuth.avatar || `https://placehold.co/40x40.png?text=${(currentLoggedInUserAuth.username || "S").substring(0,1)}`,
        receiverId: profileUser.uid, // Changed recipientId to receiverId
        receiverUsername: profileUser.username, // Changed recipientUsername to receiverUsername
        receiverAvatar: profileUser.avatar || `https://placehold.co/40x40.png?text=${(profileUser.username || "R").substring(0,1)}`, // Changed recipientAvatar to receiverAvatar
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast({ title: "Friend Request Sent!", description: `Friend request sent to ${profileUser.username}. They will see it in their notifications.` });
    } catch (error) {
      console.error('UserProfilePage: Error sending friend request:', error);
      toast({ title: "Error", description: "Could not send friend request. Check Firestore rules and console.", variant: "destructive" });
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Handle accepting a friend request
  const handleAcceptFriendRequest = async () => {
    if (!currentLoggedInUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to accept requests.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      const friendRequestId = `${profileUser.uid}_${currentLoggedInUserAuth.uid}`; // Since this is a received request
      const requestRef = doc(firestore, "friendRequests", friendRequestId);
      const batch = writeBatch(firestore);

      const requestUpdateData = { status: "accepted", updatedAt: serverTimestamp() };
      batch.update(requestRef, requestUpdateData);

      const acceptorFriendsRef = doc(firestore, "users", currentLoggedInUserAuth.uid, "friends", profileUser.uid);
      const acceptorFriendData = {
        friendUserId: profileUser.uid,
        username: profileUser.username,
        name: profileUser.fullName,
        avatar: profileUser.avatar || `https://placehold.co/40x40.png?text=${(profileUser.username || "F").substring(0,1)}`,
        since: serverTimestamp()
      };
      batch.set(acceptorFriendsRef, acceptorFriendData);

      const senderFriendsRef = doc(firestore, "users", profileUser.uid, "friends", currentLoggedInUserAuth.uid);
      const senderFriendData = {
        friendUserId: currentLoggedInUserAuth.uid,
        username: currentLoggedInUserAuth.username,
        name: currentLoggedInUserAuth.fullName || currentLoggedInUserAuth.username,
        avatar: currentLoggedInUserAuth.avatar || `https://placehold.co/40x40.png?text=${(currentLoggedInUserAuth.username || "U").substring(0,1)}`,
        since: serverTimestamp()
      };
      batch.set(senderFriendsRef, senderFriendData);

      await batch.commit();
      toast({ title: "Friend Request Accepted!", description: `You are now friends with ${profileUser.username}.` });
    } catch (error) {
      console.error("UserProfilePage (handleAcceptFriendRequest): Error accepting friend request:", error);
      toast({ title: "Error", description: "Could not accept friend request.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle unfriending
  const handleUnfriend = async () => {
    if (!currentLoggedInUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      const batch = writeBatch(firestore);
      const currentUserFriendRef = doc(firestore, "users", currentLoggedInUserAuth.uid, "friends", profileUser.uid);
      const otherUserFriendRef = doc(firestore, "users", profileUser.uid, "friends", currentLoggedInUserAuth.uid);

      batch.delete(currentUserFriendRef);
      batch.delete(otherUserFriendRef);

      await batch.commit();
      toast({ title: "Unfriended", description: `${profileUser.username} has been removed from your friends.`, variant: "destructive" });
    } catch (error) {
      console.error("UserProfilePage (handleUnfriend): Error unfriending user:", error);
      toast({ title: "Error", description: "Could not unfriend user.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle messaging (simulated)
  const handleMessage = () => {
    toast({ title: "Message (Simulated)", description: `Opening chat with ${profileUser.username}. Full chat functionality coming soon!` });
  };

  if (isLoadingAuth) {
    return <div className="container mx-auto text-center py-10">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="mt-2">Checking authentication...</p>
    </div>;
  }

  if (!profileUser || !currentLoggedInUserAuth) {
    return <div className="container mx-auto text-center py-10">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="mt-2">Loading profile...</p>
    </div>;
  }

  return (
    <div className="container mx-auto max-w-2xl">
      {/* Profile Card */}
      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader className="p-4 flex flex-row items-center space-x-4 bg-card">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={profileUser.avatar || `https://placehold.co/100x100.png?text=${(profileUser.fullName || "U").substring(0,1)}`} alt={profileUser.fullName} />
            <AvatarFallback>{profileUser.fullName.substring(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl">{profileUser.fullName}</CardTitle>
            <CardDescription className="text-sm">@{profileUser.username}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Bio Section */}
          <p className="text-sm text-muted-foreground mb-4">
            {profileUser.bio || "No bio available."}
          </p>
          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            {relationshipStatus === 'friends' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-100 text-green-700 border-green-300"
                  disabled
                >
                  <Users className="mr-2 h-4 w-4" /> Friends
                </Button>
                <Button variant="outline" size="sm" onClick={handleMessage} disabled={isProcessingAction}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Message
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleUnfriend}
                  disabled={isProcessingAction}
                >
                  <UserMinus className="mr-2 h-3 w-4" /> Unfriend
                </Button>
              </>
            ) : relationshipStatus === 'pending_sent' ? (
              <Button variant="outline" size="sm" className="text-gray-600" disabled>
                <Users className="mr-2 h-4 w-4" /> Pending
              </Button>
            ) : relationshipStatus === 'pending_received' ? (
              <Button
                variant="outline"
                size="sm"
                className="text-blue-100 border-blue-500"
                onClick={handleAcceptFriendRequest}
                disabled={isProcessingAction || !currentLoggedInUserAuth}
              >
                <Users className="mr-2 h-4 w-4" /> {isProcessingAction ? "Accepting..." : "Accept Friend Request"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-blue-500"
                onClick={handleAddFriend}
                disabled={isSendingRequest || !currentLoggedInUserAuth}
              >
                <Users className="mr-2 h-4 w-4" /> {isSendingRequest ? "Sending..." : "Add Friend"}
              </Button>
            )}
          </div>
          {/* Connections Section */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Connections</h3>
            <p className="text-sm text-muted-foreground">
              {friendsCount} {friendsCount === 1 ? 'friend' : 'friends'}
            </p>
            {mutualFriends.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">Mutual Friends:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {mutualFriends.slice(0, 3).map((friend) => (
                    <div key={friend.friendUserId} className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar || `https://placehold.co/40x40.png?text=${friend.username.substring(0,1)}`} alt={friend.username} />
                        <AvatarFallback>{friend.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{friend.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Posts Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Posts</h2>
        {posts.length > 0 ? (
          posts.map((post) => (
            <Card key={post.id} className="mb-4 shadow-md rounded-lg">
              <CardContent className="p-4">
                <p className="text-sm text-foreground mb-2">{post.content}</p>
                <p className="text-xs text-muted-foreground">
                  {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Unknown time'}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        )}
      </div>
    </div>
  );
}