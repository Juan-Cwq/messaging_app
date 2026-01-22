import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import supabase from '../supabase';
import { useSession } from './SessionContext';
import { Conversation, Message } from '../types';
import { generateKeyPair, exportKey, importKey, decryptMessage, encryptMessage } from '../lib/crypto';

interface ChatContextType {
    conversations: Conversation[];
    activeConversation: Conversation | null;
    messages: Message[];
    loading: boolean;
    setActiveConversation: (conversation: Conversation | null) => void;
    sendMessage: (content: string, type?: 'text' | 'image' | 'file') => Promise<void>;
    createConversation: (participantIds: string[], name?: string) => Promise<string>;
    refreshConversations: () => Promise<void>;
    sendTypingEvent: () => Promise<void>;
    typingUsers: Set<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { session } = useSession();
    const user = session?.user;
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

    // 1. Initialize Keys on Load
    useEffect(() => {
        const initKeys = async () => {
            if (!user) return;

            // Check for locally stored private key
            const storedPrivateKey = localStorage.getItem(`haven_priv_${user.id}`);
            const storedPublicKey = localStorage.getItem(`haven_pub_${user.id}`);

            if (storedPrivateKey && storedPublicKey) {
                try {
                    const privateKey = await importKey(storedPrivateKey, 'private');
                    const publicKey = await importKey(storedPublicKey, 'public');
                    setKeyPair({ privateKey, publicKey });
                } catch (e) {
                    console.error("Failed to import keys", e);
                }
            } else {
                // Generate new keys (Note: In a real app we'd warn the user this resets their identity/ability to read old messages)
                const newKeyPair = await generateKeyPair();
                setKeyPair(newKeyPair);

                // Save to local storage
                localStorage.setItem(`haven_priv_${user.id}`, await exportKey(newKeyPair.privateKey));
                localStorage.setItem(`haven_pub_${user.id}`, await exportKey(newKeyPair.publicKey));

                // Publish public key to profile
                // TODO: Implement profile update
                const publicKeyStr = await exportKey(newKeyPair.publicKey);
                await supabase.from('profiles').update({ public_key: publicKeyStr }).eq('id', user.id);
            }
        };

        initKeys();
    }, [user]);


    // 2. Fetch Conversations
    const fetchConversations = useCallback(async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('conversations')
            .select(`
        *,
        conversation_participants!inner(user_id)
      `)
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            return;
        }

        // TODO: Need to fetch participants details properly
        setConversations(data as any);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchConversations();

        // Subscribe to new conversations
        const subscription = supabase
            .channel('public:conversations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchConversations]);

    // 3. Fetch Messages when Active Conversation Changes
    useEffect(() => {
        if (!activeConversation || !keyPair) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', activeConversation.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
                return;
            }

            // Decrypt messages
            const decryptedMessages = await Promise.all(data.map(async (msg) => {
                try {
                    const parsedContent = JSON.parse(msg.content);
                    const decryptedText = await decryptMessage(
                        parsedContent.encryptedContent,
                        parsedContent.encryptedKeys || parsedContent.encryptedKey, // Support both
                        parsedContent.iv,
                        keyPair.privateKey,
                        user?.id || ""
                    );
                    return { ...msg, decryptedContent: decryptedText, is_mine: msg.sender_id === user?.id };
                } catch (e) {
                    console.error("Failed to decrypt message", msg.id, e);
                    return { ...msg, decryptedContent: "⚠️ Decryption Failed", is_mine: msg.sender_id === user?.id };
                }
            }));

            setMessages(decryptedMessages);
        };

        fetchMessages();

        // Subscribe to new messages
        const subscription = supabase
            .channel(`chat:${activeConversation.id}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation.id}` },
                async (payload) => {
                    const newMsg = payload.new as Message;
                    // Decrypt incoming message
                    try {
                        const parsedContent = JSON.parse(newMsg.content);
                        const decryptedText = await decryptMessage(
                            parsedContent.encryptedContent,
                            parsedContent.encryptedKeys || parsedContent.encryptedKey,
                            parsedContent.iv,
                            keyPair.privateKey,
                            user.id
                        );
                        setMessages(prev => [...prev, { ...newMsg, decryptedContent: decryptedText, is_mine: newMsg.sender_id === user?.id }]);
                    } catch (e) {
                        // If it's my own message, I might have encrypted it?
                        // Actually, I should also encrypt the key for myself!
                        setMessages(prev => [...prev, { ...newMsg, decryptedContent: "⚠️ Decryption Failed", is_mine: newMsg.sender_id === user?.id }]);
                    }
                })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [activeConversation, keyPair, user]);

    const sendMessage = async (content: string, type: 'text' | 'image' | 'file' = 'text') => {
        if (!activeConversation || !keyPair || !user) return;

        // 1. Get ALL participants
        const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', activeConversation.id);

        if (!participants) return;

        // 2. Fetch public keys for ALL participants (including self!)
        const recipientIds = participants.map(p => p.user_id);

        // Ensure we include ourselves if not returned (should be there though)
        if (!recipientIds.includes(user.id)) recipientIds.push(user.id);

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, public_key')
            .in('id', recipientIds);

        if (!profiles) return;

        // 3. Prepare Key Map
        const publicKeys: Record<string, CryptoKey> = {};
        for (const profile of profiles) {
            if (profile.public_key) {
                publicKeys[profile.id] = await importKey(profile.public_key, 'public');
            }
        }

        // Check if we have everyone's key
        if (Object.keys(publicKeys).length !== recipientIds.length) {
            // In a real app, strict mode might block sending. 
            // Warn user?
            console.warn("Some participants missing keys.");
        }

        // 4. Encrypt
        const encryptedData = await encryptMessage(content, publicKeys);
        const contentString = JSON.stringify(encryptedData);

        // 5. Send
        const { error } = await supabase.from('messages').insert({
            conversation_id: activeConversation.id,
            sender_id: user.id,
            content: contentString,
            content_type: type
        });

        if (error) {
            console.error("Failed to send message", error);
            throw error;
        }
    };

    const createConversation = async (participantIds: string[], name?: string) => {
        if (!user) throw new Error("Not authenticated");

        // Determine type
        const type = participantIds.length > 1 ? 'group' : 'direct';

        // Create conversation
        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert({
                type,
                created_by: user.id,
                name: name || null
            })
            .select()
            .single();

        if (convError) throw convError;

        // Add participants
        const participants = [user.id, ...participantIds].map(id => ({
            conversation_id: conv.id,
            user_id: id
        }));

        const { error: partError } = await supabase
            .from('conversation_participants')
            .insert(participants);

        if (partError) throw partError;

        return conv.id;
    };

    const sendTypingEvent = async () => {
        if (!activeConversation || !user) return;

        await supabase.channel(`chat:${activeConversation.id}`)
            .send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: user.id, username: user.user_metadata?.username || 'Someone' }
            });
    };

    return (
        <ChatContext.Provider value={{
            conversations,
            activeConversation,
            messages,
            loading,
            setActiveConversation,
            sendMessage,
            createConversation,
            refreshConversations: fetchConversations,
            sendTypingEvent,
            typingUsers
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
