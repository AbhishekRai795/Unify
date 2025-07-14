import React, { useState } from 'react';
import { Search, Filter, Grid, List, Users } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import ChapterCard from './ChapterCard';
import Loader from '../common/Loader';

const ChaptersList: React.FC = () => {
  const { chapters, isLoading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [registrationFilter, setRegistrationFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = ['all', ...Array.from(new Set(chapters.map(c => c.category)))];

  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = chapter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chapter.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chapter.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || chapter.category === selectedCategory;
    
    const matchesRegistration = registrationFilter === 'all' ||
                               (registrationFilter === 'open' && chapter.isRegistrationOpen) ||
                               (registrationFilter === 'closed' && !chapter.isRegistrationOpen);

    return matchesSearch && matchesCategory && matchesRegistration;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader size="lg" text="Loading chapters..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Chapters</h1>
          <p className="text-gray-600">
            Discover and join chapters that match your interests and goals.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            {/* Registration Status Filter */}
            <select
              value={registrationFilter}
              onChange={(e) => setRegistrationFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Chapters</option>
              <option value="open">Registration Open</option>
              <option value="closed">Registration Closed</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredChapters.length} of {chapters.length} chapters
            </span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Registration Open</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Registration Closed</span>
              </span>
            </div>
          </div>
        </div>

        {/* Chapters Grid/List */}
        {filteredChapters.length > 0 ? (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredChapters.map((chapter) => (
              <ChapterCard key={chapter.id} chapter={chapter} />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No chapters found</h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or check back later for new chapters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChaptersList;