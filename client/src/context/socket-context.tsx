import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { io, type Socket } from "socket.io-client";
import { apiBaseUrl } from "@/lib/constants";
import { useAuth } from "@/context/auth-context";

type SocketContextValue = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue | null>(null);

function getSocketServerUrl() {
  return apiBaseUrl.replace(/\/api$/, "");
}

export function SocketProvider({ children }: PropsWithChildren) {
  const { accessToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setSocket((currentSocket) => {
        currentSocket?.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    const nextSocket = io(getSocketServerUrl(), {
      transports: ["websocket"],
      auth: {
        token: accessToken,
      },
    });

    nextSocket.on("connect", () => {
      setIsConnected(true);
    });

    nextSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setIsConnected(false);
      setSocket(null);
    };
  }, [accessToken]);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
    }),
    [isConnected, socket],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }

  return context;
}
