# Bookmark Manager Web Application

This is a personal bookmark management web application.  It allows you to save, organize, and search your bookmarks using natural language queries.

## Features

*   **Bookmark Management:** Add, edit, and delete bookmarks.
*   **Natural Language Search:**  Find, sort, and manage bookmarks using plain English commands powered by an AI agent.
*   **AI-Powered Suggestions:** Generate descriptions and tags for bookmarks using the Gemini AI model.
*   **URL Validation:** Automatically checks if a URL is reachable (can be ignored for private/local links).
*   **Import/Export:** Import bookmarks from JSON or HTML files (Netscape Bookmark format), and export bookmarks to the same formats.
*   **Duplicate Removal:** Scans and identifies duplicate bookmarks based on title and URL.
*   **Keyboard Shortcuts:** Efficiently navigate and manage bookmarks using keyboard shortcuts.
*   **Firebase Integration:**  Persists your bookmarks using Firebase Firestore with anonymous authentication.
*   **Responsive Design:**  Works well on various screen sizes.
*   **Favicon Support:** Display favicon from URL.

## Technologies Used

*   **React:** JavaScript library for building user interfaces.
*   **Firebase:** Backend-as-a-service platform for authentication and data storage (Firestore).
*   **Gemini AI Model (via API):**  For generating bookmark descriptions and tags.
*   **Tailwind CSS:**  For styling the user interface.
*   **corsproxy.io:**  Used to fetch URL status via CORS proxy.

## Getting Started

### Prerequisites

*   Node.js and npm (Node Package Manager)
*   Firebase project configured
*   Google Cloud project to utilize Gemini API (optional, can be skipped)

### Installation and Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Firebase:**

    *   Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
    *   Enable Authentication (Anonymous) and Firestore.
    *   Obtain your Firebase configuration object.  This will typically look like:

        ```javascript
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_STORAGE_BUCKET",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID",
          measurementId: "YOUR_MEASUREMENT_ID"
        };
        ```

    *   **Important:** This application expects the Firebase configuration and app ID to be defined as global variables via the environment when the app runs, either via a build process or direct injection. While the code uses `__firebase_config` and `__app_id`, these should be replaced with your preferred method of environment variable injection.  For example, if using Webpack, you might use the DefinePlugin.

    *   If using a build tool or bundler, configure it to inject `firebaseConfig` and `appId` as global variables at build time.  Consult your bundler's documentation for specifics.

4.  **Optional: Configure Gemini API (for AI suggestions):**

    *   **Note:**  The Gemini API integration is optional.  The bookmark form will still function without it, but the "Suggest" buttons will be disabled.
    *   The Gemini API Key functionality has been removed. Please configure your own Gemini API Key setup.
    *   The Gemini API endpoint (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`) is called directly from the client-side, but could also be implemented as a serverless function.

5.  **Start the development server:**

    ```bash
    npm start
    ```

    This will usually start the application at `http://localhost:3000`.

## Usage

1.  **Add a new bookmark:**  Click the "Add New" button.  Fill in the form and click "Save Bookmark."
2.  **Edit a bookmark:** Click a bookmark to select it. Then, double-click the bookmark or press the "E" key, or click the Edit button in the details section.  Make your changes and click "Save Bookmark."
3.  **Delete a bookmark:** Click a bookmark to select it. Then, click the Delete button in the details section, or use the keyboard shortcut (Ctrl/Cmd + D).
4.  **Search for bookmarks:**  Type a natural language query in the search bar and press Enter. Examples:

    *   `find bookmarks about python`
    *   `show my 5 star bookmarks`
    *   `sort by title ascending`
    *   `github in title and sort by rating`
    *   `show top 3 javascript bookmarks`

5.  **Import/Export bookmarks:** Click the "Import/Export" button.  Choose the appropriate tab (Export, Import JSON, Import HTML) and follow the instructions.

## Keyboard Shortcuts

*   **Click:** Select a bookmark and view details.
*   **Double-click / E:** Edit the selected bookmark.
*   **Shift + Click:** Open a bookmark in a new tab.
*   **Ctrl/Cmd + Click:** Select multiple bookmarks.
*   **Ctrl/Cmd + A:** Select all bookmarks in the current view.
*   **Ctrl/Cmd + D:** Delete selected bookmarks.
*   **Esc:** Clear all selections.

## Code Structure

*   `src/BookmarkApp.js`: Main component, handles state management, Firebase interaction, and UI rendering.
*   `src/components/BookmarkForm.js`: Component for adding/editing bookmarks.
*   `src/components/ImportExportContent.js`: Component for importing/exporting bookmarks.
*   `src/components/DeleteConfirmModal.js`: Component for confirmation before deleting.
*   `src/components/HelpModal.js`: Component for explaining the application functionality.
*   `src/components/MessageModal.js`: Component for displaying messages.

## Environment Variables

The application relies on the following environment variables:

*   `__firebase_config`:  The Firebase configuration object (JSON string).
*   `__app_id`: The Firebase app ID.
*   `__initial_auth_token`: Optional. Custom token to automatically sign the user in.

**Important:** These variables are expected to be injected at build time or runtime by your environment.  Do not hardcode them directly into the source code.

## Notes

*   The URL validation feature uses `corsproxy.io` as a CORS proxy to check URL status.  This is a public service and may have limitations.
*   Error handling and user feedback are implemented through the `MessageModal` component.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.
