import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { PaperAirplaneIcon, PaperClipIcon, PhotoIcon } from '@heroicons/react/24/solid';
import { encryptFile, decryptFile } from '../../lib/crypto';
import supabase from '../../supabase';
import toast from 'react-hot-toast';

export function ChatInterface() {
    const { activeConversation, messages, sendMessage, sendTypingEvent, typingUsers } = useChat();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingUsers]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await sendMessage(newMessage);
            setNewMessage('');
        } catch (err) {
            console.error("Failed to send", err);
            toast.error("Failed to send message");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);

        // Emit typing event (throttle to once every 2s)
        if (!typingTimeoutRef.current && sendTypingEvent) {
            sendTypingEvent();
            typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
            }, 2000);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const toastId = toast.loading("Encrypting & Uploading...");

        try {
            // 1. Encrypt File
            const { encryptedBlob, key, iv } = await encryptFile(file);

            // 2. Upload Encrypted Blob
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const { data, error } = await supabase.storage
                .from('attachments')
                .upload(fileName, encryptedBlob);

            if (error) throw error;

            // 3. Construct Message Payload
            const payload = {
                type: file.type.startsWith('image/') ? 'image' : 'file',
                path: data.path,
                key,
                iv,
                mime: file.type,
                name: file.name
            };

            // 4. Send Message (Encrypted payload)
            await sendMessage(JSON.stringify(payload), payload.type as any);
            toast.success("File sent encrypted!", { id: toastId });

        } catch (err: any) {
            console.error("Upload failed", err);
            toast.error("Upload failed: " + err.message, { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!activeConversation) {
        return (
            <div className="flex items-center justify-center h-full bg-base-100 text-gray-500">
                <div className="text-center">
                    <h2 className="text-2xl font-display mb-2">Select a conversation</h2>
                    <p>Choose a secure channel to start messaging</p>
                </div>
            </div>
        );
    }

    const typingArray = typingUsers ? Array.from(typingUsers) : [];

    return (
        <div className="flex flex-col h-full bg-base-100">
            {/* Header */}
            <div className="p-4 border-b border-base-300 flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-lg">
                        {activeConversation.type === 'group' ? (activeConversation.name || 'Group Chat') : `Secure Chat`}
                    </h2>
                    <p className="text-xs text-green-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        End-to-End Encrypted
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {typingArray.length > 0 && (
                    <div className="chat chat-start">
                        <div className="chat-bubble chat-bubble-secondary bg-base-200 text-base-content opacity-50 text-xs italic">
                            {typingArray.length > 2 ? 'Multiple people are typing...' : `${typingArray.join(', ')} is typing...`}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-base-300 bg-base-100">
                <form onSubmit={handleSend} className="flex gap-2 items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <button
                        type="button"
                        className="btn btn-ghost btn-circle btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        <PaperClipIcon className="h-5 w-5" />
                    </button>

                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder={isUploading ? "Encrypting & Uploading..." : "Type a secure message..."}
                        className="input input-bordered flex-1 focus:input-primary"
                        disabled={isUploading}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary btn-circle"
                        disabled={!newMessage.trim() || isUploading}
                    >
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}

function MessageBubble({ message }: { message: any }) {
    const isMine = message.is_mine;
    const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);

    // Check if message is a rich payload (JSON)
    let content = message.decryptedContent;
    let payload: any = null;

    try {
        if (content.startsWith('{')) {
            const parsed = JSON.parse(content);
            if (parsed.type && parsed.path && parsed.key && parsed.iv) {
                payload = parsed;
            }
        }
    } catch (e) {
        // Not JSON, just text
    }

    useEffect(() => {
        if (payload && !decryptedUrl && !isDecrypting) {
            const loadFile = async () => {
                setIsDecrypting(true);
                try {
                    // Download encrypted blob
                    const { data, error } = await supabase.storage
                        .from('attachments')
                        .download(payload.path);

                    if (error) throw error;
                    if (!data) throw new Error("No data");

                    // Decrypt
                    const decryptedBlob = await decryptFile(data, payload.key, payload.iv);
                    const url = URL.createObjectURL(decryptedBlob);
                    setDecryptedUrl(url);
                } catch (e) {
                    console.error("Failed to load attachment", e);
                } finally {
                    setIsDecrypting(false);
                }
            };
            loadFile();
        }
    }, [payload, decryptedUrl, isDecrypting]);

    return (
        <div className={`chat ${isMine ? 'chat-end' : 'chat-start'}`}>
            <div className={`chat-bubble ${isMine ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                {payload ? (
                    <div className="max-w-xs">
                        {payload.type === 'image' ? (
                            decryptedUrl ? (
                                <img src={decryptedUrl} alt="Encrypted attachment" className="rounded-lg mb-1" />
                            ) : (
                                <div className="h-40 w-40 bg-base-300 animate-pulse rounded-lg flex items-center justify-center">
                                    <PhotoIcon className="h-8 w-8 opacity-50" />
                                </div>
                            )
                        ) : (
                            <div className="flex items-center gap-2 p-2 bg-base-100/10 rounded">
                                <PaperClipIcon className="h-5 w-5" />
                                <span>{payload.name}</span>
                                {decryptedUrl && (
                                    <a href={decryptedUrl} download={payload.name} className="link link-hover text-xs">Download</a>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <p>{content}</p>
                )}
            </div>
            <div className="chat-footer opacity-50 text-xs mt-1">
                {/* {new Date(message.created_at).toLocaleTimeString()} */}
            </div>
        </div>
    );
}
