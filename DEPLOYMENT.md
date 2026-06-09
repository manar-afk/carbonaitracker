# Manual Cloud Deployment Guide - CarbonAItracker

This guide provides instructions for deploying the CarbonAItracker full-stack application to the cloud manually.

The application is architected to run as a single process in production: the Express Node.js backend serves the compiled static assets of the Vite React frontend. This makes hosting simple, cost-efficient, and secure.

---

## 1. Local Production Build Test

Before pushing to your cloud server, test the production build locally:

1. Build the frontend client:
   ```bash
   cd client
   npm run build
   ```
   This compiles the React app into `client/dist/`.

2. Configure environment variables in `server/.env`:
   ```env
   PORT=5000
   JWT_SECRET=choose_a_strong_random_secret_string
   GEMINI_API_KEY=your_google_gemini_api_key_here
   GOOGLE_CLIENT_ID=your_google_sign_in_client_id_here
   NODE_ENV=production
   ```

3. Run the backend server:
   ```bash
   cd ../server
   npm install --production
   npm start
   ```
   Open `http://localhost:5000` to verify that the Express server serves the frontend app and API requests work correctly.

---

## 2. Deploying to a Linux Ubuntu VPS (AWS EC2, DigitalOcean, etc.)

Follow these steps to deploy to a clean Ubuntu Server.

### Step A: System Prerequisites
Update packages and install Node.js (v18+) and Git:
```bash
sudo apt update
sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git nginx
```

### Step B: Clone the Repository
Clone your codebase and navigate to the root folder:
```bash
git clone <your-git-repository-url> carbon-tracker
cd carbon-tracker
```

### Step C: Build the Frontend
Install frontend dependencies and build:
```bash
cd client
# Create client production environment variables if using Google auth
echo "VITE_GOOGLE_CLIENT_ID=your_google_client_id" > .env.production
npm install
npm run build
cd ..
```

### Step D: Prepare the Backend
Install backend production dependencies and create the `.env` file:
```bash
cd server
npm install --production
```
Create the `.env` file:
```bash
cat <<EOT > .env
PORT=5000
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
GOOGLE_CLIENT_ID=your_google_sign_in_client_id
EOT
```

### Step E: Set Up Process Management (PM2)
PM2 keeps your Node.js application running in the background and restarts it if the server reboots or crashes.
```bash
sudo npm install -g pm2
pm2 start server.js --name "carbon-tracker"
pm2 save
pm2 startup
# Copy and run the command printed by the output of `pm2 startup` to configure systemd boot persistence
```

### Step F: Configure Nginx as a Reverse Proxy
Create a new Nginx server configuration:
```bash
sudo nano /etc/nginx/sites-available/carbon-tracker
```
Paste the following configuration (replace `yourdomain.com` with your IP or domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/carbon-tracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step G: Secure with SSL (Let's Encrypt / Certbot)
Install Certbot to get a free SSL certificate for HTTPS:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
Follow the interactive prompts. Certbot will automatically configure SSL and set up automatic renewals.

---

## 3. Deploying to PaaS (Render, fly.io, etc.)

If you want a simpler manual deployment path without configuring virtual servers:

1. Create a **Web Service** on Render.
2. Link your Git repository.
3. Configure the following environment variables in the Render dashboard:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `a_strong_secret`
   - `GEMINI_API_KEY`: `your_key`
   - `GOOGLE_CLIENT_ID`: `your_key`
4. Set the **Build Command** to build both client and server:
   ```bash
   npm run build --prefix client && npm install --prefix server
   ```
5. Set the **Start Command**:
   ```bash
   npm start --prefix server
   ```
6. Render will build the React app, compile it, and launch the Node.js server to serve it.
