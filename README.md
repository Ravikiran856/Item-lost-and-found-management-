# Lost and Found Management System Backend

This is the backend for a Lost and Found Management System for Colleges, built with Node.js, Express, and MongoDB.

## Features

- User Authentication (Register, Login, JWT)
- Item Management (Add Lost/Found Items with Image Upload)
- Fetch Items with Filtering, Search, and Pagination
- Delete Item (Ownership Check)

## Installation

1. Clone or download the project.
2. Navigate to the project directory.
3. Install dependencies:
   ```
   npm install
   ```
4. Ensure MongoDB is running locally on port 27017.
5. Create a `.env` file in the root directory with:
   ```
   JWT_SECRET=yourjwtsecret
   MONGODB_URI=mongodb://localhost:27017/lostandfound
   ```
   (You can change the JWT secret to a secure random string.)

## Running

Start the server:
```
npm start
```

The server will run on `http://localhost:5000`.

## API Endpoints

### Authentication

- **POST /api/auth/register**
  - Body: `{ "name": "string", "email": "string", "password": "string" }`
  - Response: `{ "message": "User registered successfully" }`

- **POST /api/auth/login**
  - Body: `{ "email": "string", "password": "string" }`
  - Response: `{ "token": "jwt", "user": { "id": "id", "name": "name", "email": "email" } }`

### Items

- **POST /api/items/add**
  - Headers: `Authorization: Bearer <token>`
  - FormData: `name`, `type` (lost/found), `item_type`, `description`, `location`, `contact`, `image` (file)
  - Response: Item object

- **GET /api/items**
  - Query: `?type=all&search=string&page=1&limit=10`
  - Response: `{ "items": [...], "total": number, "pages": number }`

- **GET /api/items/:id**
  - Response: Item object

- **DELETE /api/items/:id**
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ "message": "Item deleted" }` (Only if user owns the item)

Images are served from `/uploads/`.

## Notes

- Items have auto timestamps (createdAt, updatedAt).
- Passwords are hashed with bcrypt.
- JWT middleware protects routes.
- Uses Multer for file uploads, stored in `uploads/` folder.
