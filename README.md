# TELANGANA COMMERCIAL TAXES S.C./S.T. EMPLOYEES ASSOCIATION
## Member Registration Web Application

A production-ready full-stack web application for member registration and payment tracking.

---

## Tech Stack

| Layer     | Technology                     |
|-----------|-------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS |
| Backend   | Node.js + Express              |
| Database  | MongoDB + Mongoose             |
| File Upload | Multer                       |
| OCR       | Google Vision API              |
| Excel     | ExcelJS                        |

---

## Project Structure

```
Tax-department-form2excel/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── FormPage.jsx    # Public member registration form
│   │   │   └── AdminPage.jsx   # Admin panel
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── server/                  # Express backend
    ├── models/
    │   └── Submission.js       # MongoDB schema
    ├── middleware/
    │   └── upload.js           # Multer config
    ├── routes/
    │   ├── form.js             # POST /api/submit-form
    │   └── admin.js            # GET /api/admin/*
    ├── utils/
    │   ├── ocr.js              # Google Vision OCR
    │   └── excel.js            # ExcelJS generation
    ├── uploads/                # Uploaded screenshots (auto-created)
    ├── server.js
    └── package.json
```

---

## Quick Setup (Development)

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally  OR  a MongoDB Atlas URI
- Google Cloud account with Vision API enabled (optional — OCR will be skipped if not configured)

---

### Step 1 — Clone / Download the project

```bash
cd Tax-department-form2excel
```

---

### Step 2 — Configure environment variables

```bash
cp .env.example server/.env
```

Edit `server/.env`:

```env
MONGO_URI=mongodb://localhost:27017/association_db
GOOGLE_CLIENT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
PORT=5000
CLIENT_URL=http://localhost:5173
EXPECTED_AMOUNT=500
```

---

### Step 3 — Install & run the backend

```bash
cd server
npm install
npm run dev        # development (auto-restart)
# OR
npm start          # production
```

Server starts at: http://localhost:5000

---

### Step 4 — Install & run the frontend

```bash
cd client
npm install
npm run dev        # development server at http://localhost:5173
```

---

### URLs

| Page           | URL                            |
|----------------|-------------------------------|
| Member Form    | http://localhost:5173/form     |
| Admin Panel    | http://localhost:5173/admin    |
| API Health     | http://localhost:5000/api/health |

---

## Google Vision API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable **Cloud Vision API**
4. Create a **Service Account** → download JSON key
5. Copy `client_email` and `private_key` into `server/.env`

> **Note:** If Vision credentials are not set, the app still works — payment screenshots will be marked as "Invalid Screenshot" and you can manually set the status in the admin panel.

---

## API Reference

### Public

| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| POST   | /api/submit-form   | Submit member form  |

### Admin

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | /api/admin/stats                      | Payment statistics       |
| GET    | /api/admin/responses                  | All submissions (filterable) |
| GET    | /api/admin/download-excel             | Download Excel file      |
| PATCH  | /api/admin/submissions/:id/status     | Override payment status  |
| DELETE | /api/admin/submissions/:id            | Delete a submission      |

#### Query parameters for `/responses` and `/download-excel`:
- `status` — `All | Paid | Pending | Unpaid | Invalid Screenshot`
- `startDate` — ISO date string (`YYYY-MM-DD`)
- `endDate`   — ISO date string (`YYYY-MM-DD`)

---

## Payment Status Logic

| Condition                              | Status              |
|----------------------------------------|---------------------|
| No screenshot uploaded                 | Unpaid              |
| Screenshot uploaded, no amount found   | Invalid Screenshot  |
| Amount found but < ₹500                | Pending             |
| Amount found and ≥ ₹500               | Paid                |

> Change the threshold via `EXPECTED_AMOUNT` in `.env`

---

## Production Deployment on Hostinger VPS

### 1. Server (Ubuntu/Debian)

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
sudo apt-get install -y mongodb
sudo systemctl enable mongod && sudo systemctl start mongod

# Clone project
git clone <your-repo> /var/www/association
cd /var/www/association

# Backend
cd server
npm install --production
cp /path/to/.env .env    # upload your .env

# Install PM2 globally
sudo npm install -g pm2
pm2 start server.js --name "association-api"
pm2 save && pm2 startup
```

### 2. Frontend — Production Build

```bash
cd /var/www/association/client
npm install
npm run build      # outputs to client/dist/
```

### 3. Nginx Config

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve React app
    root /var/www/association/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Express
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded screenshots
    location /uploads/ {
        alias /var/www/association/server/uploads/;
    }

    client_max_body_size 5M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/association /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Sharing the Form Link

After deployment, share this URL with all members:

```
https://your-domain.com/form
```

The admin panel is at:
```
https://your-domain.com/admin
```

---

## Excel Output

Downloaded file: `association-data-YYYY-MM-DD.xlsx`

Columns included:
1. S.No
2. Name
3. Parent's Name
4. Religion
5. Caste
6. Marital Status
7. Designation
8. Division
9. Circle
10. Education Qualifications
11. Residence Address
12. Interests / Hobbies
13. Extracted Amount (₹)
14. Payment Status *(colour-coded)*
15. Submitted At

Also includes a **Summary** sheet with totals.

---

## License

Internal use only — Telangana Commercial Taxes S.C./S.T. Employees Association.
