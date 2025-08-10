import React, { useState } from 'react';
import { Plus, Edit, Trash2, MoreVertical, User, Mail, FileText, Search } from 'lucide-react';

// Define the type for a chapter
type Chapter = {
  id: string;
  name: string;
  description?: string;
  headEmail: string;
  headName: string; // Assuming you'll fetch this
  memberCount: number;
  createdDate: string;
};

// Mock Data for initial display
const mockChapters: Chapter[] = [
  { id: '1a2b3c', name: 'Innovators Tech Club', headEmail: 'head1@example.com', headName: 'Alice Johnson', memberCount: 45, createdDate: '2023-10-26' },
  { id: '4d5e6f', name: 'Data Science Society', headEmail: 'head2@example.com', headName: 'Bob Williams', memberCount: 78, createdDate: '2023-09-15' },
  { id: '7g8h9i', name: 'Cyber Security Wing', headEmail: 'head3@example.com', headName: 'Charlie Brown', memberCount: 62, createdDate: '2023-11-01' },
];

const AdminPortal: React.FC = () => {
    const [chapters, setChapters] = useState<Chapter[]>(mockChapters);
    const [showCreateForm, setShowCreateForm] = useState(false);
    
    // Form state
    const [chapterName, setChapterName] = useState('');
    const [chapterDescription, setChapterDescription] = useState('');
    const [chapterHeadEmail, setChapterHeadEmail] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateChapter = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        // --- API Call Placeholder ---
        // Here you would make a POST request to your backend API
        // to create the user in Cognito and the chapter in DynamoDB.
        console.log('Creating chapter:', { chapterName, chapterDescription, chapterHeadEmail });

        // Simulate API call
        setTimeout(() => {
            const newChapter: Chapter = {
                id: crypto.randomUUID(),
                name: chapterName,
                description: chapterDescription,
                headEmail: chapterHeadEmail,
                headName: 'New Head', // This would come from the backend
                memberCount: 0,
                createdDate: new Date().toISOString().split('T')[0],
            };
            setChapters([...chapters, newChapter]);
            setLoading(false);
            setShowCreateForm(false);
            // Reset form
            setChapterName('');
            setChapterDescription('');
            setChapterHeadEmail('');
        }, 1000);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                        <p className="text-gray-500 mt-1">Manage all chapters and chapter heads from here.</p>
                    </div>
                    <button 
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        <span>{showCreateForm ? 'Close Form' : 'Create Chapter'}</span>
                    </button>
                </div>

                {/* Create Chapter Form */}
                {showCreateForm && (
                    <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border border-gray-200">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Create New Chapter</h2>
                        <form onSubmit={handleCreateChapter} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Chapter Name */}
                                <div>
                                    <label htmlFor="chapterName" className="block text-sm font-medium text-gray-600 mb-1">Chapter Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input id="chapterName" type="text" value={chapterName} onChange={(e) => setChapterName(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                                {/* Chapter Head Email */}
                                <div>
                                    <label htmlFor="chapterHeadEmail" className="block text-sm font-medium text-gray-600 mb-1">Chapter Head Email</label>
                                     <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input id="chapterHeadEmail" type="email" value={chapterHeadEmail} onChange={(e) => setChapterHeadEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </div>
                            {/* Chapter Description */}
                            <div>
                                <label htmlFor="chapterDescription" className="block text-sm font-medium text-gray-600 mb-1">Chapter Description (Optional)</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <textarea id="chapterDescription" value={chapterDescription} onChange={(e) => setChapterDescription(e.target.value)} rows={3} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                                </div>
                            </div>
                            {error && <p className="text-red-500">{error}</p>}
                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100">Cancel</button>
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-300">
                                    {loading ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Chapters List */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-4 flex justify-between items-center border-b">
                        <h2 className="text-xl font-semibold text-gray-700">Chapters</h2>
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" placeholder="Search chapters..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Chapter Name</th>
                                    <th scope="col" className="px-6 py-3">Chapter Head</th>
                                    <th scope="col" className="px-6 py-3">Members</th>
                                    <th scope="col" className="px-6 py-3">Created Date</th>
                                    <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chapters.map(chapter => (
                                    <tr key={chapter.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{chapter.name}</td>
                                        <td className="px-6 py-4">
                                            <div>{chapter.headName}</div>
                                            <div className="text-xs text-gray-500">{chapter.headEmail}</div>
                                        </td>
                                        <td className="px-6 py-4">{chapter.memberCount}</td>
                                        <td className="px-6 py-4">{chapter.createdDate}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="relative inline-block">
                                                <button className="p-2 rounded-full hover:bg-gray-200">
                                                    <MoreVertical size={20} />
                                                </button>
                                                {/* Dropdown for actions can be implemented here */}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPortal;
