import { useState } from 'react';
import { useContacts } from '../../hooks/useContacts';
import { useChat } from '../../context/ChatContext';
import { PlusIcon, UserIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid'; // Changed from UserCircleIcon
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Input } from '../ui';

export function ContactList() {
    const { contacts, requests, loading, sendContactRequest, respondToRequest, refreshContacts } = useContacts();
    const { createConversation } = useChat();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addUsername, setAddUsername] = useState('');
    const [activeTab, setActiveTab] = useState<'contacts' | 'requests'>('contacts');

    const handleAddContact = async () => {
        try {
            await sendContactRequest(addUsername.trim());
            setIsAddModalOpen(false);
            setAddUsername('');
            refreshContacts();
            alert("Request sent!");
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleStartChat = async (contactId: string) => {
        try {
            const convId = await createConversation([contactId]);
            // How do we switch to it? 
            // The setActiveConversation needs the full object.
            // We might need to refetch conversations or find it in the list.
            // For now, let the user find it or we force a refresh.
            // Better: Context returns the full conversation or we fetch it.
        } catch (e: any) {
            console.error(e);
            // Likely already exists, we should just open it.
            // Future improvement: createConversation should return existing one if found.
        }
    };

    if (loading) return <div className="p-4">Loading contacts...</div>;

    return (
        <div className="flex flex-col h-full bg-base-200 border-r border-base-300 w-80">
            <div className="p-4 border-b border-base-300">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold font-display text-primary-content">Contacts</h2>
                    <button onClick={() => setIsAddModalOpen(true)} className="btn btn-circle btn-sm btn-ghost">
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="tabs tabs-boxed">
                    <a className={`tab ${activeTab === 'contacts' ? 'tab-active' : ''}`} onClick={() => setActiveTab('contacts')}>Friends</a>
                    <a className={`tab ${activeTab === 'requests' ? 'tab-active' : ''}`} onClick={() => setActiveTab('requests')}>
                        Requests
                        {requests.length > 0 && <span className="badge badge-sm badge-primary ml-1">{requests.length}</span>}
                    </a>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {activeTab === 'contacts' ? (
                    <div className="p-2 space-y-2">
                        {contacts.length === 0 && <p className="text-center text-gray-500 mt-4">No contacts yet.</p>}
                        {contacts.map(contact => (
                            <div key={contact.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="avatar placeholder">
                                        <div className="bg-neutral text-neutral-content rounded-full w-8">
                                            <span>{contact.profile?.username?.[0]?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <span className="font-semibold">{contact.profile?.username}</span>
                                </div>
                                <button onClick={() => handleStartChat(contact.contact_id)} className="btn btn-ghost btn-sm btn-circle text-primary">
                                    <ChatBubbleLeftIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-2 space-y-2">
                        {requests.length === 0 && <p className="text-center text-gray-500 mt-4">No pending requests.</p>}
                        {requests.map(req => (
                            <div key={req.id} className="p-3 bg-base-100 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserIcon className="h-4 w-4 text-gray-400" />
                                    <span className="font-bold">{req.profile?.username}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" fullWidth variant="primary" onClick={() => respondToRequest(req.id, true)}>Accept</Button>
                                    <Button size="sm" fullWidth variant="outline" onClick={() => respondToRequest(req.id, false)}>Ignore</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
                <ModalHeader><ModalTitle>Add Contact</ModalTitle></ModalHeader>
                <ModalBody>
                    <Input
                        placeholder="Enter username..."
                        value={addUsername}
                        onChange={(e) => setAddUsername(e.target.value)}
                        autoFocus
                    />
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleAddContact} disabled={!addUsername.trim()}>Send Request</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
