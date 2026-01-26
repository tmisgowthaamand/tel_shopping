# Deployment Guide

This project is configured for deployment on **Vercel** (Frontend) and **Render** (Backend).

## 1. Backend (Render)
The backend requires Node.js, MongoDB, and Redis.

### Automatic Deployment (Blueprint)
1. Push your code to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your repository.
5. Render will detect `backend/render.yaml` (or you may need to specify the path if not auto-detected) and set up:
   - **API Service**: The Express server.
   - **Worker Service**: The BullMQ background worker.
   - **Redis Instance**: Managed Redis for queues.

### Manual Environment Variables
Ensure you set these in the Render Dashboard for the `telegram-store-backend` service:
- `MONGODB_URI`: Your MongoDB Atlas connection string.
- `TELEGRAM_BOT_TOKEN`: Your bot token from @BotFather.
- `JWT_SECRET`: A secure random string.
- `RAZORPAY_KEY_ID` / `SECRET`: For payments.
- `CLOUDINARY_URL`: For image storage.

## 2. Admin Panel (Vercel)
The admin panel is a Vite-based React app.

### Deployment Steps
1. Go to [Vercel Dashboard](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your repository.
4. **IMPORTANT**: In the "Root Directory" setting, select the `admin` folder.
5. Vercel will automatically detect Vite and use `npm run build`.
6. Set Environment Variables:
   - `VITE_API_URL`: The URL of your Render backend (e.g., `https://telegram-store-backend.onrender.com/api`).

## 3. Connecting Frontend & Backend
Once the backend is deployed on Render:
1. Copy the backend URL.
2. Update the `admin` environment variables on Vercel.
3. Update the `TELEGRAM_WEBHOOK_URL` in the backend environment variables to point to your Render backend URL + `/webhook/telegram`.

## 4. Database Setup
- Use **MongoDB Atlas** for a production-ready database.
- Add Render's outbound IP addresses to your MongoDB Atlas IP Access List (or allow all IPs `0.0.0.0/0` if necessary).
