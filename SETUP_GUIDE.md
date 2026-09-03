# Setup Guide: Supabase Database Setup & Gemini API Integration

This guide walks you through setting up a **Supabase PostgreSQL Database** and integrating the **Google Gemini API** into your Revalto application.

---

## Part 1: Setting up Google Gemini API

1. Go to the [Google AI Studio Console](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API Key** in the top-left sidebar.
4. Click **Create API Key** (you can create it in a new Google Cloud project or select an existing one).
5. Copy your generated API Key.
6. Create a `.env` file in the root of your project (you can copy `.env.example` as a starting point) and add your key:
   ```env
   GEMINI_API_KEY="your_actual_copied_key_here"
   ```

*Once the key is set and you restart your dev server (`npm run dev`), the Revalto AI Copilot will automatically transition from static response templates to natural language, evidence-based responses generated dynamically by **Gemini 2.5 Flash**!*

---

## Part 2: Provisioning a Supabase PostgreSQL Database

1. Sign up/Log in at [Supabase](https://supabase.com/).
2. Click **New Project** and select your organization.
3. Enter your project details:
   - **Name**: `Revalto Finance` (or similar)
   - **Database Password**: Set a secure password and save it somewhere safe.
   - **Region**: Choose a region close to you (e.g. AWS us-east-1).
   - **Pricing**: Select the **Free** tier.
4. Click **Create New Project** and wait a couple of minutes for your database to provision.

---

## Part 3: Connecting Revalto to Supabase

### 1. Get the Connection Strings
1. In your Supabase Dashboard, go to **Project Settings** (gear icon in sidebar) $\rightarrow$ **Database**.
2. Scroll down to the **Connection string** section and select the **URI** tab.
3. Copy the connection string.
   - **Transaction Connection Pooler URL (recommended for `DATABASE_URL`)**: Ensure the port is `6543` and contains `?pgbouncer=true` at the end.
   - **Direct Connection URL (recommended for `DIRECT_URL`)**: Ensure the port is `5432` (without pgbouncer parameters).
4. Update your `.env` file with these values, replacing `[YOUR-PASSWORD]` with your actual Supabase database password:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-ID]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres.[PROJECT-ID]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
   ```

### 2. Update Prisma Schema
Open the file [`prisma/schema.prisma`](file:///c:/Users/Chara/Desktop/ai%20finance%20contoller/prisma/schema.prisma) and change the `datasource db` block to use PostgreSQL instead of SQLite:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 3. Deploy the Database Schema
Execute the following commands in your shell to migrate your schema and apply seed data to your new Supabase database:

```bash
# 1. Run migrations to push the Revalto tables (User, ReconciliationRun, ReconciledTransaction, AuditLog) to Supabase:
npx prisma db push

# 2. Seed the database with the ground truth 150-event reconciliation dataset:
npm run seed
```

You are all set! Revalto will now store all reconciliation run data, user details, and transaction audit trails directly inside your persistent Supabase cloud database.

---

## Part 4: Setting up Google Sign-In

To enable Google Sign-In in your Revalto local app, you need a **Google Client ID**:

### 1. Create a Google Cloud Project & Consent Screen
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project** (e.g., name it `Revalto Auth`).
3. Search for **OAuth Consent Screen** in the search bar.
4. Select **External** user type and click **Create**.
5. Fill out the required App details (App Name: `Revalto`, User support email, Developer contact email) and click **Save and Continue**.
6. (Optional) Skip the Scopes screen and Test Users screen by clicking **Save and Continue** until you return to the Dashboard.

### 2. Generate an OAuth 2.0 Client ID
1. Navigate to **Credentials** in the left sidebar.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Set the **Application type** to **Web application**.
4. In **Authorized JavaScript origins**, click **+ Add URI** and enter:
    - `http://localhost:3000`
    - `https://revalto-ai.vercel.app`
5. Click **Create** and copy your generated **Client ID** (it will look like `your-id.apps.googleusercontent.com`).

### 3. Add to your `.env` file
Paste the copied Client ID into your project's `.env` file:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your_copied_client_id_here.apps.googleusercontent.com"
```

Restart your dev server (`npm run dev`). You can now click the **Sign In with Google** button on the Revalto login screen to automatically register new user profiles and log into your scoped database dashboard!
