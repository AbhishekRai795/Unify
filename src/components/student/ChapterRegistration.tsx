import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Mail, CheckCircle, AlertCircle, FileText, User, Hash, GraduationCap } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const ChapterRegistration: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { chapters, registerForChapter } = useData();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    motivation: '',
    experience: '',
    expectations: '',
    availability: '',
    additionalInfo: ''
  });

  const chapter = chapters.find(c => c.id === chapterId);

  if (!chapter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chapter Not Found</h2>
          <p className="text-gray-600 mb-6">The chapter you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/student/chapters')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Chapters
          </button>
        </div>
      </div>
    );
  }

  if (!chapter.isRegistrationOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Closed</h2>
          <p className="text-gray-600 mb-6">
            Registration for <strong>{chapter.name}</strong> is currently closed.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Contact:</strong> {chapter.contactEmail}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Admin:</strong> {chapter.adminName}
            </p>
          </div>
          <button
            onClick={() => navigate('/student/chapters')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Chapters
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const success = await registerForChapter(chapter.id, formData);
      if (success) {
        // Show success and redirect
        navigate('/student/chapters', { 
          state: { 
            message: `Registration submitted successfully for ${chapter.name}! You will be notified once your application is reviewed.` 
          }
        });
      } else {
        alert('Registration failed. Please try again.');
      }
    } catch (error) {
      alert('An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/student/chapters')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Chapters</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chapter Information */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-6 sticky top-8">
              {chapter.imageUrl && (
                <img
                  src={chapter.imageUrl}
                  alt={chapter.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{chapter.name}</h2>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                  Registration Open
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4">{chapter.description}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-700">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  <span>{chapter.memberCount} members</span>
                  {chapter.maxMembers && (
                    <span className="text-gray-500"> (max: {chapter.maxMembers})</span>
                  )}
                </div>
                
                <div className="flex items-center text-sm text-gray-700">
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  <span>{chapter.meetingSchedule}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-700">
                  <Mail className="h-4 w-4 mr-2 text-blue-600" />
                  <span>{chapter.contactEmail}</span>
                </div>
              </div>

              {/* Requirements */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {chapter.requirements.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Benefits</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {chapter.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/20 p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Register for {chapter.name}
                </h1>
                <p className="text-gray-600">
                  Complete the form below to submit your registration application.
                </p>
              </div>

              {/* Student Information Display */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Your Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center text-sm text-gray-700">
                    <User className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{user?.student?.name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Mail className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{user?.student?.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Hash className="h-4 w-4 mr-2 text-blue-600" />
                    <span>SAP ID: {user?.student?.sapId}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <GraduationCap className="h-4 w-4 mr-2 text-blue-600" />
                    <span>Year: {user?.student?.year}</span>
                  </div>
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Motivation */}
                <div>
                  <label htmlFor="motivation" className="block text-sm font-medium text-gray-700 mb-2">
                    Why do you want to join this chapter? *
                  </label>
                  <textarea
                    id="motivation"
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Share your motivation for joining this chapter..."
                  />
                </div>

                {/* Experience */}
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Relevant Experience
                  </label>
                  <textarea
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe any relevant experience, skills, or projects..."
                  />
                </div>

                {/* Expectations */}
                <div>
                  <label htmlFor="expectations" className="block text-sm font-medium text-gray-700 mb-2">
                    What do you hope to achieve? *
                  </label>
                  <textarea
                    id="expectations"
                    name="expectations"
                    value={formData.expectations}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What are your goals and expectations from this chapter?"
                  />
                </div>

                {/* Availability */}
                <div>
                  <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
                    Availability *
                  </label>
                  <input
                    type="text"
                    id="availability"
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Weekday evenings, Weekend mornings, etc."
                  />
                </div>

                {/* Additional Information */}
                <div>
                  <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any additional information you'd like to share..."
                  />
                </div>

                {/* Terms and Conditions */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Registration Terms</p>
                      <p>
                        By submitting this registration, you agree to actively participate in chapter 
                        activities and follow the chapter guidelines. Your application will be reviewed 
                        by the chapter admin and you will be notified of the decision via email.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => navigate('/student/chapters')}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Submit Registration</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterRegistration;