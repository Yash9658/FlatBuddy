import { Clock3, Search, SendHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { useToast } from "@/context/toast-context";
import { useChatDetail } from "@/hooks/use-chat-detail";
import { useChats } from "@/hooks/use-chats";
import { useConnections } from "@/hooks/use-connections";
import { apiFetch } from "@/lib/api";
import type { ChatMessage, ConnectionItem } from "@/lib/types";

export function InboxPage() {
  const { accessToken, user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [actingOnRequestId, setActingOnRequestId] = useState<string | null>(null);
  const { connections, isLoading: connectionsLoading, error: connectionsError } = useConnections(
    accessToken,
    refreshKey,
  );
  const { chats, isLoading: chatsLoading, error: chatsError } = useChats(accessToken, refreshKey);
  const { chat, isLoading: chatLoading, error: chatError } = useChatDetail(
    selectedChatId,
    accessToken,
    refreshKey,
  );

  useEffect(() => {
    if (!selectedChatId && chats[0]?.id) {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, selectedChatId]);

  useEffect(() => {
    setLiveMessages(chat?.messages ?? []);
  }, [chat]);

  useEffect(() => {
    if (!socket || !selectedChatId) {
      return;
    }

    socket.emit("chat:join", selectedChatId);

    return () => {
      socket.emit("chat:leave", selectedChatId);
    };
  }, [selectedChatId, socket]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleConnectionUpdate = (connection: ConnectionItem & { chatId?: string | null }) => {
      setRefreshKey((value) => value + 1);

      if (connection.chatId && connection.status === "ACCEPTED") {
        setSelectedChatId(connection.chatId);
      }
    };

    const handleChatListUpdate = () => {
      setRefreshKey((value) => value + 1);
    };

    const handleIncomingMessage = (payload: { chatId: string; message: ChatMessage }) => {
      if (payload.chatId === selectedChatId) {
        setLiveMessages((currentMessages) => {
          if (currentMessages.some((message) => message.id === payload.message.id)) {
            return currentMessages;
          }

          return [...currentMessages, payload.message];
        });
      }

      setRefreshKey((value) => value + 1);
    };

    socket.on("connection:update", handleConnectionUpdate);
    socket.on("chat:list:update", handleChatListUpdate);
    socket.on("chat:message", handleIncomingMessage);

    return () => {
      socket.off("connection:update", handleConnectionUpdate);
      socket.off("chat:list:update", handleChatListUpdate);
      socket.off("chat:message", handleIncomingMessage);
    };
  }, [selectedChatId, socket]);

  const incomingRequests = useMemo(
    () => connections.filter((connection) => connection.receiver.id === user?.id && connection.status === "PENDING"),
    [connections, user?.id],
  );

  const filteredChats = useMemo(() => {
    const normalizedSearch = chatSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return chats;
    }

    return chats.filter((thread) => {
      const otherParticipant = thread.participants.find((participant) => participant.user.id !== user?.id);
      const haystack = [
        thread.title,
        otherParticipant?.user.profile?.fullName,
        otherParticipant?.user.email,
        otherParticipant?.user.profile?.targetCity?.name,
        thread.messages[0]?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [chatSearch, chats, user?.id]);

  const unreadChatsCount = chats.filter((thread) => (thread.unreadCount ?? 0) > 0).length;
  const acceptedConnectionsCount = connections.filter((connection) => connection.status === "ACCEPTED").length;

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login to open your FlatBuddy inbox</CardTitle>
          <CardDescription>Requests and chats are available after authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleRequestAction(connectionId: string, status: "ACCEPTED" | "DECLINED") {
    setActingOnRequestId(connectionId);
    setPageMessage(null);

    try {
      const response = await apiFetch<{ chatId?: string | null }>(`/connections/${connectionId}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ status }),
      });
      setPageMessage(status === "ACCEPTED" ? "Connection accepted." : "Connection declined.");
      showToast({
        title: status === "ACCEPTED" ? "Connection accepted" : "Connection declined",
        description: status === "ACCEPTED" ? "A direct chat is now available." : "The request has been closed.",
        variant: "success",
      });
      if (response.chatId) {
        setSelectedChatId(response.chatId);
      }
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setPageMessage(actionError instanceof Error ? actionError.message : "Unable to update request.");
      showToast({
        title: "Request update failed",
        description: actionError instanceof Error ? actionError.message : "Unable to update request.",
        variant: "error",
      });
    } finally {
      setActingOnRequestId(null);
    }
  }

  async function handleSendMessage() {
    if (!selectedChatId || !draftMessage.trim()) {
      return;
    }

    setIsSendingMessage(true);
    setPageMessage(null);

    try {
      await apiFetch(`/chats/${selectedChatId}/messages`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ body: draftMessage.trim() }),
      });
      setDraftMessage("");
      showToast({ title: "Message sent", variant: "success" });
    } catch (sendError) {
      setPageMessage(sendError instanceof Error ? sendError.message : "Unable to send message.");
      showToast({
        title: "Message failed",
        description: sendError instanceof Error ? sendError.message : "Unable to send message.",
        variant: "error",
      });
    } finally {
      setIsSendingMessage(false);
    }
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Pending requests</p>
              <p className="mt-2 text-2xl font-semibold">{incomingRequests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Unread chats</p>
              <p className="mt-2 text-2xl font-semibold">{unreadChatsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Active partners</p>
              <p className="mt-2 text-2xl font-semibold">{acceptedConnectionsCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Incoming requests</CardTitle>
            <CardDescription>Accept a request to unlock a direct planning chat.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {pageMessage ? <p className="text-sm text-muted-foreground">{pageMessage}</p> : null}
            {connectionsError ? <p className="text-sm text-muted-foreground">{connectionsError}</p> : null}
            {connectionsLoading ? <p className="text-sm text-muted-foreground">Loading requests...</p> : null}
            {incomingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests right now.</p>
            ) : null}
            {incomingRequests.map((connection) => (
              <div key={connection.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {connection.sender.profile?.fullName ?? connection.sender.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {connection.sender.profile?.targetCity?.name ?? "City not set"} |{" "}
                      {connection.sender.profile?.preferredArea ?? "Area flexible"}
                    </p>
                  </div>
                  <Badge variant="outline">{connection.status.toLowerCase()}</Badge>
                </div>
                <div className="mt-3 grid gap-2 rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground md:grid-cols-2">
                  <p>Budget: Rs. {connection.sender.profile?.budgetMin ?? 0} - Rs. {connection.sender.profile?.budgetMax ?? 0}</p>
                  <p>
                    Move-in:{" "}
                    {connection.sender.profile?.moveInDate
                      ? new Date(connection.sender.profile.moveInDate).toLocaleDateString("en-IN")
                      : "Flexible"}
                  </p>
                </div>
                {connection.message ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{connection.message}</p>
                ) : null}
                <div className="mt-4 flex gap-3">
                  <Button
                    disabled={actingOnRequestId === connection.id}
                    onClick={() => void handleRequestAction(connection.id, "ACCEPTED")}
                  >
                    Accept
                  </Button>
                  <Button
                    disabled={actingOnRequestId === connection.id}
                    onClick={() => void handleRequestAction(connection.id, "DECLINED")}
                    variant="outline"
                  >
                    Decline
                  </Button>
                  <Link className={buttonVariants({ variant: "outline" })} to={`/partners/${connection.sender.id}`}>
                    View profile
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your conversations</CardTitle>
            <CardDescription>Direct tenant chats generated from accepted requests.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder="Search conversations by person, city, or last message"
              />
            </div>
            {chatsError ? <p className="text-sm text-muted-foreground">{chatsError}</p> : null}
            {chatsLoading ? <p className="text-sm text-muted-foreground">Loading chats...</p> : null}
            {!chatsLoading && filteredChats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chats match the current search.</p>
            ) : null}
            {filteredChats.map((thread) => {
              const otherParticipant = thread.participants.find((participant) => participant.user.id !== user.id);
              const latestMessage = thread.messages[0];

              return (
                <button
                  key={thread.id}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedChatId === thread.id ? "border-primary bg-primary/5" : "border-border bg-white"
                  }`}
                  onClick={() => setSelectedChatId(thread.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {otherParticipant?.user.profile?.fullName ?? otherParticipant?.user.email ?? "Chat"}
                    </p>
                    <div className="flex items-center gap-2">
                      {(thread.unreadCount ?? 0) > 0 ? <Badge variant="success">{thread.unreadCount} unread</Badge> : null}
                      <Badge variant="outline">{thread.isGroup ? "group" : "direct"}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {latestMessage?.body ?? "No messages yet."}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {latestMessage?.createdAt
                      ? `Last message ${new Date(latestMessage.createdAt).toLocaleString("en-IN")}`
                      : "Waiting for the first message"}
                  </div>
                  {otherParticipant?.user.id ? (
                    <Link
                      className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                      to={`/partners/${otherParticipant.user.id}`}
                    >
                      View profile
                    </Link>
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chat window</CardTitle>
          <CardDescription>Use this thread to coordinate area search, budget split, and landlord outreach.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={isConnected ? "success" : "outline"}>{isConnected ? "live" : "offline"}</Badge>
            Realtime updates for requests and messages
          </div>
          {chatError ? <p className="text-sm text-muted-foreground">{chatError}</p> : null}
          {chatLoading ? <p className="text-sm text-muted-foreground">Loading chat...</p> : null}
          {!chat && !chatLoading ? (
            <p className="text-sm text-muted-foreground">Select a conversation to start chatting.</p>
          ) : null}
          <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl bg-muted/40 p-4">
            {liveMessages.map((message) => {
              const isMine = message.senderId === user.id;
              const isSystem = message.senderType === "SYSTEM";

              return (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    isSystem
                      ? "self-center bg-white text-muted-foreground"
                      : isMine
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start bg-white text-foreground"
                  }`}
                >
                  {!isMine && !isSystem ? (
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">
                      {message.sender?.profile?.fullName ?? message.sender?.email}
                    </p>
                  ) : null}
                  {message.body}
                  <p className="mt-2 text-[11px] opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
          {chat ? (
            <div className="grid gap-2 rounded-2xl bg-white p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Quick prompts</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "What areas are you considering?",
                  "What is your ideal move-in date?",
                  "Should we shortlist 2 properties this week?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-full border border-border px-3 py-1 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => setDraftMessage(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex gap-3">
            <Input
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder="Type a message..."
            />
            <Button disabled={!chat || isSendingMessage} onClick={() => void handleSendMessage()}>
              <SendHorizontal className="size-4" />
              {isSendingMessage ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
