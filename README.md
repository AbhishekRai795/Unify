
# Unify Frontend

## About the Project

**Unify** is a modern, full-stack web application designed to centralize and simplify the management of college chapters, events, and memberships. Built for educational institutions, Unify empowers students, chapter heads, and administrators with dedicated portals, real-time dashboards, and a beautiful, responsive user interface.

### 🎯 Purpose
Unify solves the problem of fragmented chapter and event management in colleges by providing a single platform where:
- Students can discover, join, and participate in chapters and events.
- Chapter heads can manage their chapter’s members, events, and registrations.
- Administrators can oversee all chapters, create events, and monitor platform-wide activity.

### 🏗️ Architecture Overview
- **Frontend:** React + TypeScript SPA, styled with Tailwind CSS, built with Vite, and hosted on AWS Amplify.
- **Backend:** AWS API Gateway + Lambda (Node.js/Python) for RESTful APIs.
- **Authentication:** AWS Cognito for secure, scalable user management and role-based access.
- **Deployment:** CI/CD via Amplify, with environment variable support for seamless dev/staging/prod workflows.

### 👤 User Roles & Portals
- **Student Portal:**
   - Browse all available chapters and events
   - Register for chapters and events
   - View personal profile and participation history
- **Chapter Head Portal:**
   - Manage chapter details and members
   - Approve/reject student registrations
   - Create and manage chapter-specific events
- **Admin Portal:**
   - Create and manage all chapters and events
   - View and manage all users and registrations
   - Platform analytics and health monitoring

### ✨ Key Features
- Glassmorphism dark mode UI with purple-to-blue gradients
- Fully responsive design with mobile hamburger navigation
- Real-time API health and config status monitoring
- Secure, role-based access control for all routes
- Modern developer experience with TypeScript, ESLint, and hot reload

---

## 🌟 Features

### Core Functionality
- **🔐 Secure Authentication:** AWS Cognito-powered authentication with JWT token management
- **👥 Role-Based Access Control:** Three distinct user roles with tailored experiences:
  - **🎓 Student:** Browse and register for chapters and events
  - **👨‍💼 Chapter Head:** Manage chapter operations and member registrations
  - **⚡ Admin:** Full platform administration with superuser privileges
- **🛡️ Protected Routing:** Dynamic route protection based on user roles and authentication status
- **📊 Real-time Dashboards:** Interactive dashboards with live data and statistics

### Modern UI/UX
- **🎨 Glassmorphism Design:** Stunning glass-like effects with backdrop blur
- **🌙 Dark Mode Support:** Beautiful purple-to-blue gradient dark theme
- **📱 Fully Responsive:** Mobile-first design with hamburger navigation
- **✨ Smooth Animations:** Framer Motion-powered transitions and interactions
- **🎯 Accessibility:** Screen reader friendly with proper ARIA labels

### Technical Features
- **⚡ Lightning Fast:** Vite build system with hot module replacement
- **🔄 Environment Management:** Configurable environments for dev/staging/production
- **🏥 Health Monitoring:** Built-in API health checks and connection status
- **📈 Performance Optimized:** Code splitting and lazy loading
- **🔧 Developer Experience:** TypeScript, ESLint, and modern tooling

## 🛠️ Technologies Used

### Frontend Stack
- **⚛️ React 18** - Modern React with hooks and concurrent features
- **🔷 TypeScript** - Type-safe JavaScript for better development experience
- **⚡ Vite** - Next-generation frontend build tool
- **🎨 Tailwind CSS** - Utility-first CSS framework with custom theme
- **🛣️ React Router** - Declarative routing for React applications
- **🎭 Framer Motion** - Production-ready motion library for React
- **📅 date-fns** - Modern JavaScript date utility library
- **🎯 Lucide React** - Beautiful & consistent icon pack

### AWS Services
- **🔐 Amazon Cognito** - User authentication and authorization
- **☁️ AWS Amplify** - Frontend hosting and deployment
- **🌐 API Gateway** - RESTful API management
- **⚡ AWS Lambda** - Serverless backend functions

### Development Tools
- **📝 ESLint** - Code linting and formatting
- **🎨 PostCSS** - CSS transformation and optimization
- **🔧 TypeScript Config** - Strict type checking and modern JS features

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** - Comes with Node.js installation
- **Git** - For version control

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AbhishekRai795/Unify.git
   cd Unify/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/dev
   VITE_AWS_REGION=ap-south-1
   VITE_COGNITO_USER_POOL_ID=your-user-pool-id
   VITE_COGNITO_CLIENT_ID=your-client-id
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## 🏗️ Project Architecture

```
src/
├── components/           # Reusable UI components
│   ├── admin/           # Admin-specific components
│   │   ├── CreateEvent.tsx
│   │   ├── HeadDashboard.tsx
│   │   ├── ManageChapters.tsx
│   │   └── Registrations.tsx
│   ├── auth/            # Authentication components
│   ├── common/          # Shared components
│   │   ├── ConfigStatus.tsx    # API health monitoring
│   │   ├── ErrorMessage.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx          # Responsive navigation
│   │   ├── Loader.tsx
│   │   ├── Modal.tsx
│   │   └── ThemeToggle.tsx
│   └── student/         # Student-specific components
│       ├── ChapterCard.tsx
│       ├── ChapterRegistration.tsx
│       ├── ChaptersList.tsx
│       ├── Dashboard.tsx       # Glassmorphism dashboard
│       ├── EventsList.tsx
│       └── Profile.tsx
├── contexts/            # React Context providers
│   ├── AuthContext.tsx         # Authentication state management
│   ├── DataContext.tsx         # Application data management
│   └── ThemeContext.tsx        # Dark mode theme management
├── pages/               # Top-level page components
│   ├── AdminPortal.tsx
│   ├── AuthPage.tsx
│   ├── HeadPortal.tsx
│   ├── Home.tsx
│   └── StudentPortal.tsx
├── services/            # API and external service integrations
│   ├── adminApi.ts             # Admin-specific API calls
│   └── api.ts                  # General API utilities
├── types/               # TypeScript type definitions
│   ├── chapter.ts
│   ├── event.ts
│   └── user.ts
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── index.css            # Global styles and Tailwind imports
```

## 🎨 UI/UX Features

### Glassmorphism Design System
- **Glass Effects:** Backdrop blur with subtle transparency
- **Gradient Themes:** Purple-to-blue gradients in dark mode
- **Smooth Transitions:** 300ms duration for all interactive elements
- **Consistent Spacing:** Tailwind's design system for uniform layouts

### Responsive Design
- **Mobile-First:** Optimized for mobile devices with hamburger menu
- **Tablet & Desktop:** Adaptive layouts for larger screens
- **Touch-Friendly:** Properly sized tap targets for mobile interaction
- **Accessibility:** WCAG 2.1 compliant color contrast and navigation

### Dark Mode Implementation
- **System Preference:** Respects user's OS theme preference
- **Manual Toggle:** Easy theme switching with smooth transitions
- **Persistent Storage:** Theme preference saved in localStorage
- **Component Variants:** All components support both light and dark modes

## 🔧 Development Guidelines

### Code Style & Standards
- **TypeScript:** Strict mode enabled with proper type definitions
- **ESLint:** Enforced code formatting and best practices
- **Component Structure:** Functional components with hooks
- **File Naming:** PascalCase for components, camelCase for utilities

### State Management
- **React Context:** Global state for auth, theme, and data
- **Local State:** Component-level state with useState and useReducer
- **Data Fetching:** Custom hooks for API interactions
- **Error Handling:** Centralized error management with user feedback

### Performance Optimization
- **Code Splitting:** Route-based lazy loading
- **Image Optimization:** Responsive images with proper formats
- **Bundle Analysis:** Regular bundle size monitoring
- **Caching Strategy:** Proper HTTP caching headers and service worker

## 🚀 Deployment

### AWS Amplify Deployment

1. **Environment Variables in Amplify Console:**
   ```
   VITE_API_BASE_URL=https://your-production-api-url
   VITE_AWS_REGION=ap-south-1
   VITE_COGNITO_USER_POOL_ID=production-user-pool-id
   VITE_COGNITO_CLIENT_ID=production-client-id
   ```

2. **Build Specification (amplify.yml):**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Required AWS Configurations:**
   - **API Gateway CORS:** Enable for your Amplify domain
   - **Cognito Callback URLs:** Add Amplify domain to allowed callbacks
   - **IAM Permissions:** Proper roles for API Gateway and Lambda access

## 🔍 Monitoring & Debugging

### Built-in Health Checks
- **API Connectivity:** Real-time API health monitoring
- **Authentication Status:** Cognito connection verification  
- **Environment Validation:** Configuration status display
- **Error Boundaries:** Graceful error handling with user feedback

### Development Tools
- **React Developer Tools:** Component tree inspection
- **Vite DevTools:** Build performance monitoring
- **Network Tab:** API request/response debugging
- **Console Logging:** Structured logging for development

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Commit changes:** `git commit -m 'Add amazing feature'`
4. **Push to branch:** `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Standards
- Follow existing code patterns and conventions
- Write meaningful commit messages
- Add proper TypeScript types for new features
- Test responsive design on multiple devices
- Ensure accessibility compliance

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Contact

- **Issues:** [GitHub Issues](https://github.com/AbhishekRai795/Unify/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AbhishekRai795/Unify/discussions)
- **Email:** abhishekrai795@example.com

---

Made with ❤️ by [Abhishek Rai](https://github.com/AbhishekRai795)
