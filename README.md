# FiBear Admin Mobile App

FiBear Admin is a React Native mobile application built with Expo, designed for administrators to manage FiBear Network services. This app allows admins to oversee subscribers, job orders, billing, support tickets, and chat functionalities.

## Features

*   **Dashboard Overview:** Provides a quick look at key metrics like total subscribers, overdue payments, and open tickets.
*   **Subscriber Management:** View, search, and manage subscriber details, including their active plans and billing history.
*   **Job Order Management:** Track and manage job orders, assign them to field agents, and update their status.
*   **Billing Management:** Create, view, and manage customer bills, including overdue and paid statuses.
*   **Ticket Management:** Handle customer support tickets, track their progress, and communicate with users.
*   **Live Chat:** Engage in real-time conversations with users and manage chat sessions.
*   **User Profile & Settings:** Admins can edit their profile, change passwords, and access app settings.
*   **Notifications:** Receive push notifications for important events and manage background task registrations.

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   Expo CLI: `npm install -g expo-cli`

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd ADMIN
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory of the project and add the following variables:
    ```    API_BASE_URL=YOUR_API_BASE_URL
    CONFIG_INTERNAL_API_KEY=YOUR_INTERNAL_API_KEY
    ```
    Replace `YOUR_API_BASE_URL` and `YOUR_INTERNAL_API_KEY` with your actual values. These can be found in your `app.config.js` file.

### Running the App

1.  **Start the Expo development server:**
    ```bash
    npx expo start
    ```

2.  **Run on your device or simulator:**
    *   **On Device:** Scan the QR code displayed in the terminal using the Expo Go app on your iOS or Android device.
    *   **On iOS Simulator:** Press `i` in the terminal.
    *   **On Android Emulator:** Press `a` in the terminal.

## Project Structure

```
ADMIN/
├── assets/               # Static assets like images and fonts
├── components/           # Reusable UI components
├── contexts/             # React Context providers for state management
├── hooks/                # Custom React hooks
├── navigation/           # Navigation configuration (AppNavigator)
├── screens/              # All app screens (AdminDashboard, UserManagement, etc.)
├── services/             # API service, notification service, etc.
├── App.js                # Main App component
├── App.json              # Expo configuration
├── babel.config.js       # Babel configuration
├── package.json          # Project dependencies and scripts
├── package-lock.json     # Lock file for installed dependencies
└── .env                  # Environment variables (add this file)
└── .gitignore            # Git ignore file
```

## Environment Variables

The application relies on environment variables for configuration. Ensure you have a `.env` file in the root directory with the following:

*   `API_BASE_URL`: The base URL for your backend API.
*   `CONFIG_INTERNAL_API_KEY`: The internal API key for accessing certain configurations.

## Contribution

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature (`git checkout -b feature/your-feature`).
3.  Make your changes and commit them (`git commit -m 'Add your-feature'`).
4.  Push to the branch (`git push origin your-feature`).
5.  Open a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
