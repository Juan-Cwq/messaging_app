import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Input } from '../ui';
import supabase from '../../supabase';

export function ConversationList() {
    const { conversations, activeConversation, setActiveConversation, loading, createConversation } = useChat();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [usernameInput, setUsernameInput] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateChat = async () => {
        if (!usernameInput.trim()) return;
        setIsCreating(true);
        try {
            // Find user by username
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', usernameInput.trim())
                .single();

            if (error || !profiles) {
                alert('User not found');
                setIsCreating(false);
                return;
            }

            await createConversation([profiles.id]);
            setIsModalOpen(false);
            setUsernameInput('');
        } catch (err: any) {
            console.error(err);
            alert('Failed to create chat: ' + err.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-base-200 border-r border-base-300 w-80">
            <div className="p-4 border-b border-base-300 flex justify-between items-center">
                <h2 className="text-xl font-bold font-display text-primary-content">Messages</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-circle btn-sm btn-ghost hover:bg-base-300"
                    title="New Chat"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>

            {loading ? (
                <div className="p-4 text-center text-gray-400">Loading chats...</div>
            ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-400 mt-4">
                    <p>No conversations yet.</p>
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-link btn-sm mt-2">Start one</button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => setActiveConversation(conv)}
                            className={`w-full p-4 text-left border-b border-base-300 hover:bg-base-100 transition-colors ${activeConversation?.id === conv.id ? 'bg-base-100 border-l-4 border-l-primary' : ''
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="avatar placeholder">
                                    <div className="bg-neutral-focus text-neutral-content rounded-full w-10">
                                        <span className="text-xl">
                                            {/* Logic to show other participant initial */}
                                            {conv.participants?.[0]?.username?.[0]?.toUpperCase() || '?'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">
                                        {/* Logic to show other participant name */}
                                        Conversation {conv.id.substring(0, 4)}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {conv.last_message_preview || "No messages"}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <ModalHeader>
                    <ModalTitle>New Conversation</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">Enter the username of the person you want to chat with.</p>
                        <Input
                            placeholder="Username"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            autoFocus
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateChat} isLoading={isCreating} disabled={!usernameInput.trim()}>Start Chat</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
