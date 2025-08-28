# Authentication Backend Implementation

This document describes the authentication backend implementation for the Season Calendar application.

## Overview

The backend now includes full authentication support that works seamlessly with your Angular frontend's Supabase authentication. The backend verifies JWT tokens from Supabase and provides user management endpoints.

## Available Endpoints

### Authentication Verification

- `POST /api/auth/verify` - Verify JWT token and get user info
- `GET /api/auth/status` - Check authentication status (optional auth)

### User Profile Management

- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/profile` - Create user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/profile/full` - Get user with profile data

### Admin Operations

- `GET /api/auth/admin-status` - Check admin privileges
- `GET /api/auth/admin/users` - List all users (admin only)
- `PUT /api/auth/admin/users/:userId/role` - Update user role (admin only)

## Authentication Flow

1. User signs in through your Angular frontend using Supabase
2. Frontend gets JWT token from Supabase
3. Frontend sends requests with `Authorization: Bearer <token>` header
4. Backend verifies token with Supabase and processes request

## Usage Examples

### Frontend Integration

Update your Angular HTTP interceptor to include the token:

```typescript
// In your auth.interceptor.ts
intercept(req: HttpServletRequest, next: HttpHandler): Observable<HttpEvent<any>> {
  const token = this.authService.getCurrentSession()?.access_token;

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next.handle(req);
}
```

### Verify User Authentication

```typescript
// In your Angular service
async verifyUser(): Promise<any> {
  return this.http.post('/api/auth/verify', {}).toPromise();
}
```

### Get User Profile

```typescript
async getUserProfile(): Promise<any> {
  return this.http.get('/api/auth/me').toPromise();
}
```

### Update Profile

```typescript
async updateProfile(data: any): Promise<any> {
  return this.http.put('/api/auth/profile', data).toPromise();
}
```

## Middleware Usage

The backend provides several middleware functions for route protection:

### `authenticateToken`

Requires valid JWT token:

```javascript
router.get("/protected", authenticateToken, (req, res) => {
  // req.user contains user info
  res.json({ user: req.user });
});
```

### `optionalAuthentication`

Works with or without token:

```javascript
router.get("/public", optionalAuthentication, (req, res) => {
  // req.user is available if token was provided
  const isAuthenticated = !!req.user;
  res.json({ isAuthenticated });
});
```

### `requireAdmin`

Requires admin privileges (use after authenticateToken):

```javascript
router.get("/admin-only", authenticateToken, requireAdmin, (req, res) => {
  res.json({ message: "Admin access granted" });
});
```

### `requireEmailConfirmed`

Requires confirmed email (use after authenticateToken):

```javascript
router.get(
  "/confirmed-only",
  authenticateToken,
  requireEmailConfirmed,
  (req, res) => {
    res.json({ message: "Email confirmed" });
  }
);
```

## Database Schema Requirements

Make sure your Supabase database has a `profiles` table:

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Policy for user creation
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);
```

## Environment Variables

Make sure these environment variables are set in your backend:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
CORS_ORIGINS=http://localhost:4200,https://yourdomain.com
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:

- `MISSING_TOKEN` - No authorization header
- `INVALID_TOKEN` - Invalid or expired token
- `NOT_AUTHENTICATED` - Authentication required
- `INSUFFICIENT_PRIVILEGES` - Admin access required
- `EMAIL_NOT_CONFIRMED` - Email confirmation required
- `ACCESS_DENIED` - Insufficient permissions

## Security Considerations

1. **Token Verification**: All tokens are verified with Supabase
2. **CORS**: Properly configured for your domains
3. **Rate Limiting**: Consider adding rate limiting middleware
4. **Input Validation**: Add validation for user inputs
5. **Logging**: Implement proper logging for security events

## Next Steps

1. **Add Input Validation**: Use Zod or similar for request validation
2. **Add Rate Limiting**: Protect against abuse
3. **Add Audit Logging**: Track authentication events
4. **Add Email Services**: For notifications and confirmations
5. **Add Role-Based Permissions**: More granular access control

## Integration with Existing Routes

Your events routes now support both authenticated and unauthenticated access:

```javascript
// Events route with optional authentication
router.get("/", optionalAuthentication, (req, res) => {
  const userId = req.user?.id || req.headers["user-id"];
  return getEvents(req, res, userId);
});
```

This maintains backward compatibility while adding authentication support.
