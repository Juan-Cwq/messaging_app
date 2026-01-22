import { useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import supabase from "../supabase";
import { Button, ThemeToggle } from "../components/ui";
import { ArrowRightOnRectangleIcon, UsersIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { ConversationList } from "../components/chat/ConversationList";
import { ContactList } from "../components/contacts/ContactList";
import { ChatInterface } from "../components/chat/ChatInterface";
import { pseudoEmailToUsername } from "../lib/identity";

const ProtectedPage = () => {
  const { session } = useSession();
  const [sidebarMode, setSidebarMode] = useState<'chats' | 'contacts'>('chats');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const username = session?.user.user_metadata?.username ||
    pseudoEmailToUsername(session?.user.email || "");

  return (
    <main className="flex flex-col h-screen bg-base-100 overflow-hidden">
      {/* Header */}
      <header className="flex-none flex items-center justify-between p-3 border-b border-base-300 bg-base-100 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/haven-icon.svg" alt="Haven" className="h-8 w-8" />
            <span className="font-display text-xl font-semibold hidden md:inline">Haven</span>
          </Link>
          <div className="flex bg-base-200 rounded-lg p-1 gap-1">
            <button
              onClick={() => setSidebarMode('chats')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${sidebarMode === 'chats' ? 'bg-white shadow text-primary' : 'hover:bg-base-300'}`}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 inline mr-1" />
              Chats
            </button>
            <button
              onClick={() => setSidebarMode('contacts')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${sidebarMode === 'contacts' ? 'bg-white shadow text-primary' : 'hover:bg-base-300'}`}
            >
              <UsersIcon className="h-5 w-5 inline mr-1" />
              Contacts
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono opacity-50 mr-2">{username}</span>
          <Link to="/settings" className="btn btn-ghost btn-circle btn-sm">
            <Cog6ToothIcon className="h-5 w-5" />
          </Link>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Chat Layout */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarMode === 'chats' ? <ConversationList /> : <ContactList />}
        <div className="flex-1 flex flex-col min-w-0 bg-base-100 relative">
          <ChatInterface />
        </div>
      </div>
    </main>
  );
};

export default ProtectedPage;
