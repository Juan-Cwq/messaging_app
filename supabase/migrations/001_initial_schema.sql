-- Haven Database Schema
-- Version: 1.0.0
-- Description: Initial schema for Haven secure messaging application

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption utilities
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CUSTOM TYPES
-- ============================================

-- Contact request status
CREATE TYPE contact_status AS ENUM ('pending', 'accepted', 'blocked');

-- Message status
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');

-- Conversation type
CREATE TYPE conversation_type AS ENUM ('direct', 'group');

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Extends auth.users with Haven-specific data

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    public_key TEXT, -- For E2EE (user's public key)
    status TEXT DEFAULT 'offline', -- online, offline, away
    last_seen_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- ============================================
-- CONTACTS TABLE
-- ============================================
-- Manages user connections/contacts

CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status contact_status DEFAULT 'pending' NOT NULL,
    nickname TEXT, -- Optional custom name for the contact
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate contacts
    UNIQUE(user_id, contact_id),
    -- Prevent self-contacts
    CHECK (user_id != contact_id)
);

-- Indexes for contact queries
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_contact_id ON public.contacts(contact_id);
CREATE INDEX idx_contacts_status ON public.contacts(status);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
-- Stores conversation metadata

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type conversation_type DEFAULT 'direct' NOT NULL,
    name TEXT, -- For group conversations
    avatar_url TEXT, -- For group conversations
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT, -- Encrypted preview for UI
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for sorting by recent activity
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- ============================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================
-- Links users to conversations (many-to-many)

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- admin, member
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_read_at TIMESTAMPTZ,
    notifications_enabled BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,

    -- Prevent duplicate participants
    UNIQUE(conversation_id, user_id)
);

-- Indexes for participant queries
CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_archived ON public.conversation_participants(user_id, is_archived);

-- ============================================
-- MESSAGES TABLE
-- ============================================
-- Stores encrypted messages

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Encrypted content (client-side E2EE)
    content TEXT NOT NULL, -- Encrypted message content
    content_type TEXT DEFAULT 'text', -- text, image, file, etc.

    -- Message metadata
    status message_status DEFAULT 'sent' NOT NULL,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

    -- Disappearing messages
    expires_at TIMESTAMPTZ, -- NULL = permanent

    -- Attachments metadata (encrypted references)
    attachments JSONB DEFAULT '[]',

    -- Edit tracking
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for message queries
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_expires_at ON public.messages(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- MESSAGE READ RECEIPTS TABLE
-- ============================================
-- Tracks who has read which messages

CREATE TABLE IF NOT EXISTS public.message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    UNIQUE(message_id, user_id)
);

-- Index for read receipt queries
CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON public.message_read_receipts(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete expired messages
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM public.messages
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
BEGIN
    -- Check if conversation already exists
    SELECT c.id INTO conv_id
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'direct'
      AND cp1.user_id = user1_id
      AND cp2.user_id = user2_id;

    -- If not found, create new conversation
    IF conv_id IS NULL THEN
        INSERT INTO public.conversations (type, created_by)
        VALUES ('direct', user1_id)
        RETURNING id INTO conv_id;

        -- Add both participants
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES (conv_id, user1_id), (conv_id, user2_id);
    END IF;

    RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on contacts
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on conversations
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update conversation's last_message_at when new message is inserted
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Auto-create profile on new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view any profile (for contact search)
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- CONTACTS POLICIES
-- ============================================

-- Users can view their own contacts
CREATE POLICY "Users can view own contacts"
    ON public.contacts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = contact_id);

-- Users can create contact requests
CREATE POLICY "Users can create contact requests"
    ON public.contacts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update contacts they own or are the target of
CREATE POLICY "Users can update relevant contacts"
    ON public.contacts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = contact_id)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = contact_id);

-- Users can delete their own contacts
CREATE POLICY "Users can delete own contacts"
    ON public.contacts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================

-- Users can view conversations they participate in
CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id AND user_id = auth.uid()
        )
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Conversation admins can update conversations
CREATE POLICY "Admins can update conversations"
    ON public.conversations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id
              AND user_id = auth.uid()
              AND role = 'admin'
        )
    );

-- ============================================
-- CONVERSATION PARTICIPANTS POLICIES
-- ============================================

-- Users can view participants in their conversations
CREATE POLICY "Users can view conversation participants"
    ON public.conversation_participants FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
        )
    );

-- Conversation creator can add participants
CREATE POLICY "Creator can add participants"
    ON public.conversation_participants FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id AND created_by = auth.uid()
        )
        OR user_id = auth.uid() -- User can add themselves
    );

-- Users can update their own participation (archive, notifications)
CREATE POLICY "Users can update own participation"
    ON public.conversation_participants FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can leave conversations (delete their participation)
CREATE POLICY "Users can leave conversations"
    ON public.conversation_participants FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id
              AND user_id = auth.uid()
        )
    );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id
              AND user_id = auth.uid()
        )
    );

-- Users can update their own messages (edit, delete)
CREATE POLICY "Users can update own messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());

-- ============================================
-- MESSAGE READ RECEIPTS POLICIES
-- ============================================

-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts"
    ON public.message_read_receipts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_id AND cp.user_id = auth.uid()
        )
    );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
    ON public.message_read_receipts FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_id AND cp.user_id = auth.uid()
        )
    );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Enable realtime for conversation_participants table
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Enable realtime for contacts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;

-- Enable realtime for profiles table (for online status)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================
-- SCHEDULED JOBS (requires pg_cron extension)
-- ============================================

-- Note: To enable scheduled deletion of expired messages,
-- you need to enable pg_cron in your Supabase dashboard and run:
-- SELECT cron.schedule('delete-expired-messages', '*/5 * * * *', 'SELECT delete_expired_messages();');
