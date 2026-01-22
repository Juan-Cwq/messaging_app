import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useContacts } from '../../hooks/useContacts';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Input } from '../ui';
import { UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
    const { createConversation } = useChat();
    const { contacts } = useContacts();

    const [groupName, setGroupName] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    const toggleContact = (id: string) => {
        if (selectedContactIds.includes(id)) {
            setSelectedContactIds(selectedContactIds.filter(cid => cid !== id));
        } else {
            setSelectedContactIds([...selectedContactIds, id]);
        }
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedContactIds.length === 0) return;
        setIsCreating(true);
        try {
            await createConversation(selectedContactIds, groupName.trim());
            onClose();
            setGroupName('');
            setSelectedContactIds([]);
            alert("Group created!");
        } catch (e: any) {
            console.error(e);
            alert("Failed to create group: " + e.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader>
                <ModalTitle>Create New Group</ModalTitle>
            </ModalHeader>
            <ModalBody>
                <div className="space-y-4">
                    <div>
                        <label className="label">
                            <span className="label-text">Group Name</span>
                        </label>
                        <Input
                            placeholder="e.g. Project Team"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text">Add Members</span>
                            <span className="label-text-alt">{selectedContactIds.length} selected</span>
                        </label>
                        <div className="max-h-60 overflow-y-auto border border-base-300 rounded-lg p-2 space-y-2">
                            {contacts.length === 0 && <p className="text-center text-sm text-gray-500 p-2">No contacts available.</p>}
                            {contacts.map(contact => (
                                <div
                                    key={contact.id}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedContactIds.includes(contact.contact_id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-base-200'}`}
                                    onClick={() => toggleContact(contact.contact_id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="avatar placeholder">
                                            <div className="bg-neutral text-neutral-content rounded-full w-8">
                                                <span className="text-xs">{contact.profile?.username?.[0]?.toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium">{contact.profile?.username}</span>
                                    </div>
                                    {selectedContactIds.includes(contact.contact_id) && (
                                        <UserPlusIcon className="h-5 w-5 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleCreate}
                    isLoading={isCreating}
                    disabled={!groupName.trim() || selectedContactIds.length === 0}
                >
                    Create Group
                </Button>
            </ModalFooter>
        </Modal>
    );
}
