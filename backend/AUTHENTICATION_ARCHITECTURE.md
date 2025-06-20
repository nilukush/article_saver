# Authentication & Article Synchronization Architecture

## How Account Linking Works

When you have linked accounts (e.g., email/password + Google + GitHub), all these authentication methods point to the same user identity. Here's how it works:

### 1. Unified User Identity
- **Primary Account**: Your main account (e.g., `nilukush@gmail.com` with provider "local")
- **Linked Accounts**: OAuth accounts (Google, GitHub) that are linked to your primary account
- **Single User Context**: Regardless of login method, you're authenticated as the same user

### 2. Article Storage & Access
Articles are stored in the database with a `userId` field that references the user who owns them.

#### When you login with email/password:
- You authenticate as user ID: `c1d7ac36-420a-4d32-8983-8ce084cc5ce9` (your primary account)
- You see all articles associated with this user ID

#### When you login with Google:
- You authenticate as the Google account, but the enterprise authentication middleware resolves this to your primary account
- The JWT token contains your primary user ID
- You see the same articles as when logging in with email/password

#### When you login with GitHub:
- Same as Google - resolves to your primary account
- Same articles visible

### 3. Article Synchronization
Since all login methods resolve to the same user ID:
- **Articles imported from Pocket**: Associated with your primary user ID
- **Articles added manually**: Associated with your primary user ID
- **Article deletion**: Removes articles from the database for your user ID

### 4. Real-world Example
```
User: nilukush@gmail.com
Primary Account ID: c1d7ac36-420a-4d32-8983-8ce084cc5ce9

Login Methods:
1. Email/Password → Resolves to → c1d7ac36-420a-4d32-8983-8ce084cc5ce9
2. Google OAuth → Resolves to → c1d7ac36-420a-4d32-8983-8ce084cc5ce9
3. GitHub OAuth → Resolves to → c1d7ac36-420a-4d32-8983-8ce084cc5ce9

Articles Table:
- Article 1: userId = c1d7ac36-420a-4d32-8983-8ce084cc5ce9
- Article 2: userId = c1d7ac36-420a-4d32-8983-8ce084cc5ce9
- Article 3: userId = c1d7ac36-420a-4d32-8983-8ce084cc5ce9

Result: All login methods see the same 3 articles
```

### 5. What Happens When You Delete Articles
When you delete an article:
1. The article is removed from the database
2. Since all login methods resolve to the same user ID, the deletion is reflected across all login methods
3. If you delete all articles, you'll see 0 articles regardless of how you log in

### 6. Security & Isolation
- Articles are strictly isolated by user ID
- Other users cannot see your articles
- Linked accounts share the same article pool because they resolve to the same user identity

## Summary
**YES** - When you sync from Pocket and use either Google, GitHub, or email/password to login:
- ✅ Articles will be visible in all of them
- ✅ If you delete articles, the deletion will be reflected across all login methods
- ✅ All login methods access the same pool of articles
- ✅ This is by design - account linking creates a unified identity