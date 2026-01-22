import { useState, useCallback, useEffect } from 'react';
import supabase from '../supabase';
import { Contact } from '../types';
import { useSession } from '../context/SessionContext';

export function useContacts() {
    const { session } = useSession();
    const user = session?.user;

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [requests, setRequests] = useState<Contact[]>([]); // Incoming requests
    const [loading, setLoading] = useState(true);

    const fetchContacts = useCallback(async () => {
        if (!user) return;

        // Fetch accepted contacts
        const { data: contactsData, error: contactsError } = await supabase
            .from('contacts')
            .select(`
        *,
        profile:contact_id(*)
      `)
            .eq('user_id', user.id)
            .eq('status', 'accepted');

        if (contactsError) console.error('Error fetching contacts:', contactsError);
        else setContacts(contactsData as any || []);

        // Fetch pending INCOMING requests (where I am the contact_id)
        // Actually, usually 'contacts' table is unidirectional or bidirectional? 
        // Let's check schema/migration.
        // Schema: 
        // user_id UUID REFERENCES profiles(id)
        // contact_id UUID REFERENCES profiles(id)
        // status contact_status
        // UNIQUE(user_id, contact_id)

        // If Alice adds Bob: user_id=Alice, contact_id=Bob, status='pending'
        // Bob needs to see this. He needs to query where contact_id = Bob AND status = 'pending'.

        // Wait, if Bob accepts, do we flip it? Or do we create a reverse record?
        // User policy says: "Users can view own contacts: auth.uid() = user_id OR auth.uid() = contact_id"

        const { data: requestsData, error: requestsError } = await supabase
            .from('contacts')
            .select(`
        *,
        profile:user_id(*) 
      `)
            .eq('contact_id', user.id)
            .eq('status', 'pending');

        if (requestsError) console.error('Error fetching requests:', requestsError);
        else setRequests(requestsData as any || []);

        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchContacts();

        const subscription = supabase
            .channel('contacts:changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'contacts' },
                () => {
                    fetchContacts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchContacts]);

    const sendContactRequest = async (username: string) => {
        if (!user) throw new Error("Not authenticated");

        // 1. Find user by username
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (profileError || !profile) throw new Error("User not found");
        if (profile.id === user.id) throw new Error("Cannot add yourself");

        // 2. Check if already exists
        // We can rely on UNIQUE constraint violation or check first.

        // 3. Insert Request
        const { error } = await supabase
            .from('contacts')
            .insert({
                user_id: user.id,
                contact_id: profile.id,
                status: 'pending'
            });

        if (error) {
            if (error.code === '23505') throw new Error("Contact request already exists");
            throw error;
        }
    };

    const respondToRequest = async (requestId: string, accept: boolean) => {
        if (!user) return;

        if (accept) {
            // Update status to accepted
            const { error } = await supabase
                .from('contacts')
                .update({ status: 'accepted' })
                .eq('id', requestId);

            if (error) throw error;

            // Bi-directional? 
            // If Alice added Bob (pending), and Bob accepts:
            // Row 1: Alice -> Bob (accepted)
            // Should we create Bob -> Alice (accepted)? 
            // Yes, for a friends systems usually both need rows, OR the query logic handles it.
            // Let's create the reverse row for explicit bidirectional friendship.

            // We need to know who sent it (Alice). 
            const { data: req } = await supabase.from('contacts').select('user_id').eq('id', requestId).single();
            if (req) {
                const { error: reverseError } = await supabase
                    .from('contacts')
                    .insert({
                        user_id: user.id,
                        contact_id: req.user_id,
                        status: 'accepted'
                    });
                // Ignore unique violation if it exists?
            }

        } else {
            // Reject = Delete or Block?
            // Let's delete for now
            const { error } = await supabase
                .from('contacts')
                .delete()
                .eq('id', requestId);
            if (error) throw error;
        }
    };

    return {
        contacts,
        requests,
        loading,
        sendContactRequest,
        respondToRequest,
        refreshContacts: fetchContacts
    };
}
