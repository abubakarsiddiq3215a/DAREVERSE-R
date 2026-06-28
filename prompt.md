# DareVerse - MVP Development Prompt

You are tasked with building a full-featured social media web application called "DareVerse". This platform revolves around users sending challenges (dares) to each other, completing them by submitting proofs, and verifying or voting on those proofs. The application should have a premium, modern, and highly interactive user interface.

## Technology Stack
- **Frontend Framework:** React.js
- **Styling:** Vanilla CSS (focus on glassmorphism, dark themes, and dynamic micro-animations)
- **Animations:** GSAP (GreenSock Animation Platform) for page transitions and complex animations
- **Backend/Database:** Firebase (Authentication and Firestore for real-time data sync)

## Core Application State & Global Listeners
The application should maintain a global state (e.g., in a main `App.jsx` component) that listens to Firebase Firestore in real-time. 
- Ensure you set up `onSnapshot` listeners for the following collections:
  - `users`: Real-time user profiles sync.
  - `social/{userId}`: Friend lists.
  - `social/{userId}/requests`: Incoming friend requests.
  - `challenges`: All global challenges/dares.
  - `proofs`: Submitted proofs for challenges.
  - `notification`: Real-time alerts for the current user.
- Show browser alert "toasts" for new incoming notifications (friend requests, challenge events, proof approvals) if they are received within the last few seconds.
- Use GSAP for page routing transitions to create a smooth SPA feel.

## Pages to Implement

### 1. Feed (`Feed.jsx`)
- The main landing page after login.
- Displays a chronological list of recent activities, active challenges, and recently verified proofs.
- Users can interact with feed items (view proofs, submit proofs, etc.).

### 2. Challenges (`Challenges.jsx`)
- A dedicated page to browse open, active, and completed challenges.
- Allow users to filter or sort challenges.
- Includes buttons to "Create Challenge" or "Submit Proof".

### 3. Friends (`Friends.jsx`)
- Displays the user's current friends.
- Shows pending incoming and outgoing friend requests with accept/reject buttons.
- Option to challenge specific friends directly from this page.

### 4. Proofs Inbox (`ProofsInbox.jsx`)
- An inbox specifically for creators of challenges to review submitted proofs.
- Shows a list of pending proofs awaiting verification.
- Options to open the verification modal to approve or reject a proof.

### 5. Leaderboard (`Leaderboard.jsx`)
- Ranks users based on their activity (e.g., challenges completed, proofs verified).
- Highlights top users with unique badges or styles.

### 6. Profile (`Profile.jsx`)
- Displays the current user's profile details, stats, and history of challenges/proofs.
- Ability to edit profile details.
- Includes a trigger for simulating adding funds or payments.

### 7. Admin Dashboard (`AdminDashboard.jsx`)
- A restricted view for admin users (checked via Firestore roles or specific emails).
- Allows moderation of users, global challenges, and system-wide settings.

### 8. Login (`Login.jsx`)
- Clean, modern authentication screen.
- Handles user sign-in and sign-up using Firebase Auth.

## Modals and Workflows

### 1. Create Challenge (`CreateChallenge.jsx`)
- A modal to create a new dare.
- Users can specify the challenge details, set a reward/bounty, and tag specific friends.
- Integrates a payment/bounty step before finalizing.

### 2. Submit Proof (`SubmitProof.jsx`)
- A modal where users can submit their proof (text, links, or simulated uploads) for a specific challenge they accepted.

### 3. View / Verify / Vote Proof (`ViewProof.jsx`)
- A multi-purpose modal for interacting with a submitted proof.
- **View Mode:** Simply looking at a completed proof.
- **Verify Mode:** For the challenge creator to approve or reject the proof.
- **Vote Mode:** For community-driven challenges where users vote on the validity or quality of the proof.

### 4. Notifications Panel (`NotificationsPanel.jsx`)
- A slide-out or dropdown panel showing the user's notifications.
- Supports marking individual or all notifications as read, and clearing them.

### 5. Payment Modal (`PaymentModal.jsx`)
- A simulated payment gateway interface.
- Used when users set a bounty on a challenge or add funds to their profile.
- Should look like a realistic checkout process.

## UI/UX Guidelines
1. **Visual Excellence:** Implement a sleek, dark-mode aesthetic with vibrant accent colors. Use glassmorphism effects (translucent backgrounds with blur) for modals and panels.
2. **Typography:** Use modern fonts (like Inter or Outfit). Ensure clear visual hierarchy.
3. **Animations:** Do not just rely on CSS transitions. Use GSAP for layout changes, page mounts, and modal entries (e.g., scaling up from opacity 0).
4. **Feedback:** Every action (button click, form submit) should provide immediate visual feedback (loading spinners, toast messages, button color changes).

Build these components ensuring high reusability and clean code architecture. Each feature must accurately update and reflect the real-time Firebase state.
