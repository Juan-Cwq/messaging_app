export interface Profile {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    public_key: string | null;
    status: 'online' | 'offline' | 'away';
    last_seen_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Contact {
    id: string;
    user_id: string;
    contact_id: string;
    status: 'pending' | 'accepted' | 'blocked';
    nickname: string | null;
    created_at: string;
    updated_at: string;
    profile?: Profile; // Joined profile data
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
    id: string;
    type: ConversationType;
    name: string | null;
    avatar_url: string | null;
    created_by: string | null;
    last_message_at: string | null;
    last_message_preview: string | null;
    created_at: string;
    updated_at: string;
    participants?: Profile[]; // Joined participants
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string; // Encrypted string
    content_type: 'text' | 'image' | 'file';
    status: 'sent' | 'delivered' | 'read';
    reply_to_id: string | null;
    expires_at: string | null;
    created_at: string;
    is_mine?: boolean; // Helper for UI
    decryptedContent?: string; // Helper for UI after decryption
}

export interface KeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}
