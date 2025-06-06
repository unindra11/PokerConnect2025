'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, getDocs, onSnapshot, writeBatch, serverTimestamp, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { firestore, auth } from "@/lib/firebase";
import { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Users, MessageCircle, UserMinus, UserPlus, Check, X } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { Separator } from "@/components/ui/separator";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const username = params?.username as string;

  const [currentLoggedInUserAuth, setCurrentLoggedInUserAuth] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState<"not_friends" | "friends" | "pending_sent" | "pending_received">("not_friends");
  const [posts, setPosts] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentLoggedInUserAuth(user);
      } else {
        setCurrentLoggedInUserAuth(null);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch the profile user data based on username
  useEffect(() => {
    async function fetchProfileUser() {
      if (!username) return;
      console.log('Fetching profile for username:', username);
      try {
        const usersQuery = query(
          collection(firestore, 'users'),
          where('username', '==', username.toLowerCase())
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

  // Fetch user's posts
  useEffect(() => {
    if (!profileUser) return;

    const postsQuery = query(
      collection(firestore, 'posts'),
      where('userId', '==', profileUser.uid)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsData);
    }, (error) => {
      console.error('UserProfilePage: Error fetching posts:', error);
      toast({ title: "Error", description: "Could not load posts.", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [profileUser, toast]);

  // Fetch user's friends
  useEffect(() => {
    if (!profileUser) return;

    const friendsCollection = collection(firestore, 'users', profileUser.uid, 'friends');
    const unsubscribe = onSnapshot(friendsCollection, (snapshot) => {
      const friendsData = snapshot.docs.map((doc) => doc.data());
      setFriends(friendsData);
    }, (error) => {
      console.error('UserProfilePage: Permission denied accessing friends:', error);
      toast({ title: "Error", description: "Could not load friends list.", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [profileUser, toast]);

  // Check relationship status between current user and profile user
  useEffect(() => {
    if (!currentLoggedInUserAuth || !profileUser) return;

    const checkRelationship = () => {
      console.log('Checking relationship between', currentLoggedInUserAuth.uid, 'and', profileUser.uid);
      const friendsQuery = query(
        collection(firestore, 'users', currentLoggedInUserAuth.uid, 'friends'),
        where('friendUserId', '==', profileUser.uid)
      );

      const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
        console.log(
          `Friends query snapshot for ${currentLoggedInUserAuth.uid}:`,
          snapshot.docs.map(doc => doc.data())
        );
        if (!snapshot.empty) {
          console.log('Users are friends. Setting relationshipStatus to "friends"');
          setRelationshipStatus('friends');
          return;
        }

        console.log('No friendship found. Checking for pending friend requests...');
        // Check sent request (current user -> profile user)
        const sentRequestId = `${currentLoggedInUserAuth.uid}_${profileUser.uid}`;
        const sentRequestRef = doc(firestore, 'friendRequests', sentRequestId);
        const unsubscribeSent = onSnapshot(sentRequestRef, (docSnapshot) => {
          if (docSnapshot.exists() && docSnapshot.data().status === 'pending') {
            console.log('Found a pending sent request:', docSnapshot.data());
            setRelationshipStatus('pending_sent');
          } else {
            if (relationshipStatus !== 'friends' && relationshipStatus !== 'pending_received') {
              console.log('No sent request found.');
              setRelationshipStatus('not_friends');
            }
          }
        }, (error) => {
          console.error('Error checking sent friend request:', error);
          toast({ title: "Error", description: "Could not load relationship status.", variant: "destructive" });
          setRelationshipStatus('not_friends');
        });

        // Check received request (profile user -> current user)
        const receivedRequestId = `${profileUser.uid}_${currentLoggedInUserAuth.uid}`;
        const receivedRequestRef = doc(firestore, 'friendRequests', receivedRequestId);
        const unsubscribeReceived = onSnapshot(receivedRequestRef, (docSnapshot) => {
          if (docSnapshot.exists() && docSnapshot.data().status === 'pending') {
            console.log('Found a pending received request:', docSnapshot.data());
            setRelationshipStatus('pending_received');
          } else {
            if (relationshipStatus !== 'friends' && relationshipStatus !== 'pending_sent') {
              console.log('No received request found.');
              setRelationshipStatus('not_friends');
            }
          }
        }, (error) => {
          console.error('Error checking received friend request:', error);
          toast({ title: "Error", description: "Could not load relationship status.", variant: "destructive" });
          setRelationshipStatus('not_friends');
        });

        return () => {
          unsubscribeFriends();
          unsubscribeSent();
          unsubscribeReceived();
        };
      }, (error) => {
        console.error('Error checking friends:', error);
        toast({ title: "Error", description: "Could not load relationship status.", variant: "destructive" });
        setRelationshipStatus('not_friends');
      });
    };

    const unsubscribe = checkRelationship();
    return () => unsubscribe && unsubscribe();
  }, [currentLoggedInUserAuth, profileUser, toast]);

  const handleAddFriend = async () => {
    if (!currentLoggedInUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to send requests.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      const friendRequestId = `${currentLoggedInUserAuth.uid}_${profileUser.uid}`;
      const requestRef = doc(firestore, "friendRequests", friendRequestId);
      const requestData = {
        senderId: currentLoggedInUserAuth.uid,
        receiverId: profileUser.uid,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const notificationRef = doc(collection(firestore, "users", profileUser.uid, "notifications"));
      const notificationData = {
        type: "friend_request",
        senderId: currentLoggedInUserAuth.uid,
        senderUsername: currentLoggedInUserAuth.username || currentLoggedInUserAuth.email.split('@')[0],
        senderAvatar: currentLoggedInUserAuth.avatar || `https://placehold.co/40x40.png?text=${(currentLoggedInUserAuth.username || "U").substring(0,1)}`,
        createdAt: serverTimestamp(),
        read: false,
      };

      const batch = writeBatch(firestore);
      batch.set(requestRef, requestData);
      batch.set(notificationRef, notificationData);
      await batch.commit();

      toast({ title: "Friend Request Sent!", description: `Request sent to ${profileUser.username}.` });
    } catch (error) {
      console.error("UserProfilePage (handleAddFriend): Error sending friend request:", error);
      toast({ title: "Error", description: "Could not send friend request.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!currentLoggedInUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to cancel requests.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      const friendRequestId = `${currentLoggedInUserAuth.uid}_${profileUser.uid}`; // Since this is a sent request
      const requestRef = doc(firestore, "friendRequests", friendRequestId);
      await getDoc(requestRef).then((doc) => {
        if (doc.exists()) {
          const batch = writeBatch(firestore);
          batch.delete(requestRef);
          const notificationsQuery = query(
            collection(firestore, "users", profileUser.uid, "notifications"),
            where("senderId", "==", currentLoggedInUserAuth.uid),
            where("type", "==", "friend_request")
          );
          getDocs(notificationsQuery).then((notificationsSnapshot) => {
            notificationsSnapshot.forEach((notificationDoc) => {
              batch.delete(notificationDoc.ref);
            });
            batch.commit();
          });
        }
      });

      toast({ title: "Friend Request Cancelled", description: `Request to ${profileUser.username} has been cancelled.` });
      setRelationshipStatus("not_friends");
    } catch (error) {
      console.error("UserProfilePage (handleCancelFriendRequest): Error cancelling friend request:", error);
      toast({ title: "Error", description: "Could not cancel friend request.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

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

      const notificationsQuery = query(
        collection(firestore, "users", currentLoggedInUserAuth.uid, "notifications"),
        where("senderId", "==", profileUser.uid),
        where("type", "==", "friend_request")
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.forEach((notificationDoc) => {
        batch.delete(notificationDoc.ref);
      });

      await batch.commit();
      toast({ title: "Friend Request Accepted!", description: `You are now friends with ${profileUser.username}.` });
    } catch (error) {
      console.error("UserProfilePage (handleAcceptFriendRequest): Error accepting friend request:", error);
      toast({ title: "Error", description: "Could not accept friend request.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!currentLoggedInUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to decline requests.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      const friendRequestId = `${profileUser.uid}_${currentLoggedInUserAuth.uid}`; // Since this is a received request
      const requestRef = doc(firestore, "friendRequests", friendRequestId);
      const batch = writeBatch(firestore);

      const requestUpdateData = { status: "declined", updatedAt: serverTimestamp() };
      batch.update(requestRef, requestUpdateData);

      const notificationsQuery = query(
        collection(firestore, "users", currentLoggedInUserAuth.uid, "notifications"),
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
    } catch (error) {
      console.error("UserProfilePage (handleDeclineFriendRequest): Error declining friend request:", error);
      toast({ title: "Error", description: "Could not decline friend request.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleUnfriend = async () => {
    if (!currentLoggedInUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to unfriend users.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);

    try {
      const batch = writeBatch(firestore);

      const currentUserFriendRef = doc(firestore, "users", currentLoggedInUserAuth.uid, "friends", profileUser.uid);
      const profileUserFriendRef = doc(firestore, "users", profileUser.uid, "friends", currentLoggedInUserAuth.uid);

      batch.delete(currentUserFriendRef);
      batch.delete(profileUserFriendRef);

      const friendRequestId = `${currentLoggedInUserAuth.uid}_${profileUser.uid}`;
      const reverseFriendRequestId = `${profileUser.uid}_${currentLoggedInUserAuth.uid}`;
      const friendRequestRef = doc(firestore, "friendRequests", friendRequestId);
      const reverseFriendRequestRef = doc(firestore, "friendRequests", reverseFriendRequestId);

      const friendRequestDoc = await getDoc(friendRequestRef);
      if (friendRequestDoc.exists()) {
        batch.delete(friendRequestRef);
      }

      const reverseFriendRequestDoc = await getDoc(reverseFriendRequestRef);
      if (reverseFriendRequestDoc.exists()) {
        batch.delete(reverseFriendRequestRef);
      }

      await batch.commit();
      toast({ title: "Unfriended", description: `You are no longer friends with ${profileUser.username}.` });
      setRelationshipStatus("not_friends");
    } catch (error) {
      console.error("UserProfilePage (handleUnfriend): Error unfriending user:", error);
      toast({ title: "Error", description: "Could not unfriend user.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleMessage = () => {
    if (!currentLoggedInUserAuth || !profileUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to send messages.", variant: "destructive" });
      return;
    }
    router.push(`/messages/${profileUser.uid}`);
  };

  if (!profileUser) {
    return <div>Loading...</div>;
  }

  const isOwnProfile = currentLoggedInUserAuth?.uid === profileUser.uid;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="relative">
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-lg"></div>
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              <Avatar className="h-24 w-24 border-4 border-white">
                <AvatarImage src={profileUser.avatar} alt={profileUser.username} />
                <AvatarFallback>{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </CardHeader>
          <CardContent className="pt-16 text-center">
            <CardTitle className="text-xl">{profileUser.fullName || profileUser.username}</CardTitle>
            <p className="text-muted-foreground">@{profileUser.username}</p>
            <div className="mt-4 flex items-center justify-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{profileUser.location || "Unknown location"}</span>
            </div>
            <p className="mt-2 text-sm">{profileUser.bio || "No bio yet."}</p>

            {!isOwnProfile && (
              <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
                {relationshipStatus === "not_friends" && (
                  <Button onClick={handleAddFriend} disabled={isProcessingAction}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Friend
                  </Button>
                )}
                {relationshipStatus === "pending_sent" && (
                  <Button
                    variant="outline"
                    onClick={handleCancelFriendRequest}
                    disabled={isProcessingAction}
                  >
                    <X className="mr-2 h-4 w-4" /> Cancel Request
                  </Button>
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
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-green-100 text-green-700 border-green-300"
                      disabled
                    >
                      <Users className="mr-2 h-4 w-4" /> Friends
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleMessage}>
                      <MessageCircle className="mr-2 h-4 w-4" /> Message
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleUnfriend}>
                      <UserMinus className="mr-2 h-4 w-4" /> Unfriend
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <div className="md:col-span-2">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>
            <TabsContent value="posts">
              <Card>
                <CardHeader>
                  <CardTitle>Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <div key={post.id}>
                        <PostCard post={post} />
                        <Separator className="my-4" />
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No posts yet.</p>
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
                  {friends.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {friends.map((friend, index) => (
                        <div key={index} className="flex items-center space-x-4">
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