# Deployment

This project has two deployable parts:

- Frontend: Vite/React app, published with GitHub Pages
- Backend: Express API, deployed to a Node host such as Render

## 1. Create the GitHub Repository

Create a new empty repository:

```text
RageshVarma99/chit_fund
```

Do not add a README, license, or gitignore in GitHub.

## 2. Push the Project

From this project folder, push the prepared commit:

```bash
git --git-dir=/tmp/chit_fund_git --work-tree="/home/qualviz/Documents/Ragesh/Chit Fund/chit-fund-app" push -u origin main
```

## 3. Publish the Frontend

In GitHub:

```text
Settings -> Pages -> Source -> GitHub Actions
```

The frontend will publish to:

```text
https://RageshVarma99.github.io/chit_fund/
```

## 4. Deploy the Backend

Create a MongoDB Atlas database and copy its connection string.

Deploy `src/server` on Render as a Web Service:

```text
Root Directory: src/server
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

Set Render environment variables:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/chitfund
CLIENT_ORIGIN=https://RageshVarma99.github.io
UPLOADS_DIR=./uploads
```

This repository also includes `render.yaml`, so Render can detect the backend service as a Blueprint. You still need to provide the `MONGODB_URI` value in Render.

## 5. Connect Frontend to Backend

After Render gives a backend URL, add this GitHub Actions repository variable:

```text
VITE_API_URL=https://your-render-service.onrender.com
```

Location:

```text
GitHub repo -> Settings -> Secrets and variables -> Actions -> Variables
```

Run the GitHub Pages workflow again after setting the variable.

## File Upload Note

Uploaded documents are stored on the backend filesystem. For production, use Render persistent disk or move uploads to object storage such as S3 or Cloudinary.
