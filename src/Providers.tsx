import { Outlet } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import { ChatProvider } from "./context/ChatContext";
import { Toaster } from 'react-hot-toast';

const Providers = () => {
  return (
    <SessionProvider>
      <ChatProvider>
        <Outlet />
        <Toaster position="top-center" />
      </ChatProvider>
    </SessionProvider>
  );
};

export default Providers;
