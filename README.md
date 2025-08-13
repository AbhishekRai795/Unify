# Unify Frontend

This is the frontend for Unify, a web application designed to streamline the management of college chapters and events. It provides dedicated portals for students, chapter heads, and administrators, each with role-specific functionalities.

## Features

- **User Authentication:** Secure user authentication and management powered by AWS Cognito.
- **Role-Based Access Control:**  The application supports three distinct user roles:
    - **Student:** Can browse and register for various chapters and events.
    - **Chapter Head:** Can manage their specific chapter, view member registrations, and oversee chapter-related activities.
    - **Admin:** Has superuser privileges to manage all chapters, create and manage events, and view all user registrations across the platform.
- **Dedicated User Portals:** Each role has a tailored dashboard and interface to access relevant features and information.
- **Dynamic Routing:** Protected routes ensure that users can only access the pages and features appropriate for their role.
- **Interactive UI:** Built with React and styled with Tailwind CSS for a modern and responsive user experience.

## Technologies Used

- **Framework:** [React](https://reactjs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Routing:** [React Router](https://reactrouter.com/)
- **Authentication:** [Amazon Cognito](https://aws.amazon.com/cognito/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd unify-frontend
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

To start the local development server, run the following command:

```bash
npm run dev
```

This will start the application on `http://localhost:5173` by default.

### Building for Production

To create a production-ready build of the application, run:

```bash
npm run build
```

This will generate a `dist` directory with the optimized and minified assets.

## Project Structure

```
/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── common/
│   │   └── student/
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── DataContext.tsx
│   ├── pages/
│   │   ├── AdminPortal.tsx
│   │   ├── AuthPage.tsx
│   │   ├── HeadPortal.tsx
│   │   └── StudentPortal.tsx
│   ├── services/
│   │   ├── adminApi.ts
│   │   └── api.ts
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

- **`src/components`**: Contains reusable React components, organized by feature or role (e.g., `admin`, `student`, `common`).
- **`src/contexts`**: Holds the React Context providers for managing global state, such as authentication (`AuthContext`) and application data (`DataContext`).
- **`src/pages`**:  Contains the top-level page components that correspond to the main sections of the application (e.g., `AdminPortal`, `StudentPortal`).
- **`src/services`**:  Includes modules for interacting with external APIs.
- **`src/types`**: Defines the TypeScript types and interfaces used throughout the application.
- **`App.tsx`**: The main application component, responsible for setting up the routing structure.
- **`main.tsx`**: The entry point of the application where the React app is mounted to the DOM.
