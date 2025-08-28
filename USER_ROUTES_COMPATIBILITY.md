# User Routes Compatibility Layer

This document explains the compatibility layer created to support the existing frontend `UserService` alongside the new authentication system.

## Problem Solved

The frontend has an existing `UserService` that expects endpoints at `/api/users/*` with a specific data format, but the new authentication system uses `/api/auth/*` endpoints with a different format.

## Solution

Created a compatibility layer that:

1. **Provides `/api/users/*` endpoints** that delegate to the authentication system
2. **Transforms data formats** to match the legacy `UserProfile` interface
3. **Maintains security** using the same authentication middleware
4. **Preserves existing functionality** without breaking changes

## Available Endpoints

### Core Profile Management

- `GET /api/users/:userId/profile` - Get user profile (with ownership check)
- `PUT /api/users/:userId/profile` - Update user profile (with ownership check)
- `POST /api/users/profile` - Create user profile
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile

### Additional Endpoints (Placeholders)

- `GET /api/users/:userId/stats` - User statistics
- `GET /api/users/:userId/preferences` - User preferences
- `PUT /api/users/:userId/preferences` - Update preferences
- `GET /api/users/:userId/activity` - Activity log
- `POST /api/users/:userId/avatar` - Avatar upload
- `PUT /api/users/:userId/email` - Update email
- `POST /api/users/verify-email` - Verify email update
- `DELETE /api/users/:userId` - Delete account
- `GET /api/users/:userId/export` - Export user data

## Data Format Transformation

### Legacy UserProfile Interface

```typescript
interface UserProfile {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  name: string;
  country: string;
  age: number | null;
  position: string;
  avatar_url: string;
  timezone: string;
  plan_type: "free" | "pro" | "premium";
  plan_start_date: string | null;
  plan_end_date: string | null;
  trial_end_date: string | null;
  is_active: boolean;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  last_payment_date: string | null;
  next_payment_due: string | null;
  payment_status: "pending" | "paid" | "past_due" | "canceled";
  created_at?: string;
  updated_at?: string;
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "country": "US",
    "age": 25,
    "position": "Forward",
    "avatar_url": "https://...",
    "timezone": "UTC",
    "plan_type": "free",
    "is_active": true
    // ... other fields
  }
}
```

## Database Schema Extension

The `profiles` table has been extended to support additional fields:

```sql
-- New fields added to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  country TEXT DEFAULT '',
  age INTEGER,
  position TEXT DEFAULT '',
  timezone TEXT DEFAULT 'UTC',
  plan_type TEXT DEFAULT 'free',
  plan_start_date TIMESTAMPTZ,
  plan_end_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  stripe_customer_id TEXT DEFAULT '',
  stripe_subscription_id TEXT DEFAULT '',
  last_payment_date TIMESTAMPTZ,
  next_payment_due TIMESTAMPTZ,
  payment_status TEXT DEFAULT 'pending';
```

## Security Features

All endpoints require authentication and implement proper authorization:

- **Token Verification**: JWT tokens validated via Supabase
- **Ownership Checks**: Users can only access their own profiles
- **Role-Based Access**: Admin endpoints protected appropriately
- **Input Validation**: Proper error handling and validation

## Usage Examples

### Get User Profile

```typescript
// Frontend UserService call
this.userService.getUserProfile(userId).subscribe((profile) => {
  console.log(profile); // UserProfile interface
});

// Backend endpoint: GET /api/users/:userId/profile
// Response: { success: true, data: UserProfile }
```

### Update Profile

```typescript
// Frontend UserService call
const updates = { name: "New Name", country: "US" };
this.userService.updateUserProfile(userId, updates).subscribe((profile) => {
  console.log(profile); // Updated UserProfile
});

// Backend endpoint: PUT /api/users/:userId/profile
// Response: { success: true, data: UserProfile }
```

## Implementation Notes

### Controllers

- `userController.js` - Handles legacy format transformations
- `authController.js` - Handles authentication format

### Routes

- `userRoutes.js` - Legacy compatibility endpoints
- `authRoutes.js` - New authentication endpoints

### Middleware

- Same authentication middleware used for both systems
- Ownership validation ensures security
- Error handling provides consistent responses

## Migration Strategy

1. **Phase 1**: Legacy endpoints work alongside new auth system ✅
2. **Phase 2**: Frontend gradually migrated to use auth endpoints
3. **Phase 3**: Legacy endpoints can be deprecated (future)

## Best Practices

1. **Use Auth Endpoints**: For new features, prefer `/api/auth/*` endpoints
2. **Maintain Compatibility**: Don't break existing `/api/users/*` usage
3. **Security First**: All endpoints require proper authentication
4. **Data Consistency**: Both systems work with the same database
5. **Error Handling**: Consistent error responses across both systems

## Testing

Both endpoint systems should be tested to ensure:

- Authentication works correctly
- Data formats are consistent
- Security policies are enforced
- Error handling is appropriate

The compatibility layer ensures zero downtime migration while maintaining full functionality.
