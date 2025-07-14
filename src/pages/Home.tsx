import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, BookOpen, ArrowRight, CheckCircle, Star, Zap } from 'lucide-react';

const Home: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: 'Join Chapters',
      description: 'Connect with like-minded students and explore your interests through various student chapters.',
      color: 'blue'
    },
    {
      icon: Calendar,
      title: 'Attend Events',
      description: 'Participate in workshops, seminars, competitions, and social events organized by chapters.',
      color: 'green'
    },
    {
      icon: BookOpen,
      title: 'Learn & Grow',
      description: 'Develop new skills, gain knowledge, and build lasting relationships with peers and mentors.',
      color: 'purple'
    }
  ];

  const benefits = [
    'Access to exclusive workshops and seminars',
    'Networking opportunities with industry professionals',
    'Leadership development programs',
    'Skill-building competitions and challenges',
    'Community service and social impact projects',
    'Career guidance and mentorship'
  ];

  const stats = [
    { number: '50+', label: 'Active Chapters' },
    { number: '1000+', label: 'Students Connected' },
    { number: '200+', label: 'Events Hosted' },
    { number: '95%', label: 'Satisfaction Rate' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Connect. Learn.{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Grow.
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Join Unify to discover student chapters, attend exciting events, and build meaningful 
              connections that will shape your academic and professional journey.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-green-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Unify?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover the benefits of joining our vibrant student community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:shadow-lg transition-all duration-200 group">
                <div className={`w-16 h-16 bg-gradient-to-r ${
                  feature.color === 'blue' ? 'from-blue-500 to-blue-600' :
                  feature.color === 'green' ? 'from-green-500 to-green-600' :
                  'from-purple-500 to-purple-600'
                } rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Our Impact</h2>
              <p className="text-xl opacity-90">
                See how Unify is making a difference in student life.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
                  <div className="text-lg opacity-90">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                What You'll Get
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join thousands of students who are already benefiting from our platform.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Student Testimonial</h3>
                    <p className="text-sm text-gray-600">Computer Science, 2024</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  "Unify has completely transformed my college experience. I've joined three different 
                  chapters, attended amazing workshops, and made lifelong friends. The platform makes 
                  it so easy to discover opportunities I never knew existed!"
                </p>
                <div className="mt-4 text-sm text-gray-600">
                  - Sarah Johnson
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-200 rounded-full opacity-60"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-purple-200 rounded-full opacity-60"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-12 border border-white/20 shadow-xl">
            <Zap className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join the Unify community today and unlock endless opportunities for growth and connection.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;