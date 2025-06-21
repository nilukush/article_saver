# Enterprise-Grade Analysis: Deletion Across Linked Accounts

## Executive Summary
After extensive analysis, the **most enterprise-grade solution** is to provide **USER CHOICE** with **CLEAR DEFAULTS**. Deleting from all linked accounts by default is NOT the standard - it violates data sovereignty principles.

## How Major Platforms Handle This

### 1. **Google Accounts**
- **Separate by Default**: Each Google service (Gmail, YouTube, Drive) maintains separate data
- **Explicit Sharing**: Users must explicitly share data between services
- **Deletion Scope**: Deleting Gmail emails does NOT delete YouTube videos
- **Account Linking**: Used for SSO, NOT data merging

### 2. **Microsoft Accounts**
- **Account Switching**: Users can switch between work/personal accounts
- **Data Isolation**: OneDrive personal ≠ OneDrive for Business
- **Deletion**: "Delete all" only affects current account context
- **Enterprise Policy**: Strict data separation for compliance

### 3. **GitHub**
- **Organization Context**: Repositories belong to specific orgs/users
- **Deletion Scope**: Deleting repos only affects current context
- **Account Linking**: For access, not data merging

### 4. **Meta (Facebook/Instagram)**
- **Accounts Center**: Explicitly asks which accounts to affect
- **User Control**: "Delete from Facebook only" vs "Delete from all accounts"
- **Default**: Single account operations

## Industry Best Practices

### 1. **Data Sovereignty**
- Each account owns its data
- Cross-account operations require explicit consent
- Default to narrow scope (Principle of Least Privilege)

### 2. **GDPR/Privacy Compliance**
- **Purpose Limitation**: Data collected for one account shouldn't automatically be accessible to another
- **Consent**: Explicit consent required for cross-account operations
- **Right to Erasure**: Must be account-specific unless user requests otherwise

### 3. **Security Principles**
- **Blast Radius Limitation**: Compromise of one account shouldn't affect all
- **Audit Trail**: Every cross-account operation must be logged
- **Reversibility**: Users should be able to undo bulk operations

## Recommended Implementation

### Option 1: **Explicit Choice** (RECOMMENDED - Most Enterprise)
```typescript
interface DeleteOptions {
  scope: 'current' | 'all-linked' | 'selected';
  selectedAccounts?: string[];
  requireConfirmation: boolean;
}
```

**UI Flow:**
1. User clicks "Delete All"
2. Modal appears: "Delete from current account or all linked accounts?"
3. Show affected accounts with counts
4. Require explicit confirmation

### Option 2: **Smart Defaults with Override**
- Default: Current account only
- Show notice: "2,800 articles in linked accounts will remain"
- Provide "Delete from all accounts" as secondary option

### Option 3: **Account Context Switching**
- Like Google/Microsoft
- User explicitly switches account context
- Operations only affect active account

## Current Implementation Issues

1. **Inconsistent Behavior**: GET shows all, DELETE affects one
2. **No User Consent**: Automatic cross-account deletion
3. **No Audit Trail**: Missing detailed logs
4. **Irreversible**: No undo mechanism

## Recommended Solution

```typescript
// Backend route with explicit scope
router.delete('/bulk/all', authenticateToken, async (req, res) => {
  const { scope = 'current' } = req.query; // Default to current only
  const userId = req.user.userId;
  
  if (scope === 'all-linked') {
    // Require additional confirmation token
    const { confirmationToken } = req.body;
    if (!verifyConfirmationToken(confirmationToken)) {
      throw new Error('Additional confirmation required for cross-account deletion');
    }
    
    const userIds = await getAllLinkedUserIds(userId);
    // Log extensive audit trail
    await logCrossAccountDeletion(userId, userIds);
    
    // Delete from all
    const result = await prisma.article.deleteMany({
      where: { userId: { in: userIds } }
    });
  } else {
    // Delete from current only
    const result = await prisma.article.deleteMany({
      where: { userId }
    });
  }
});
```

## UI Requirements

1. **Clear Labeling**: "Delete from this account" vs "Delete from all accounts"
2. **Impact Preview**: Show article counts for each account
3. **Confirmation**: Two-step confirmation for cross-account
4. **Undo Option**: 30-day soft delete for recovery

## Conclusion

The most enterprise-grade solution is NOT to automatically delete from all linked accounts. Instead:

1. **Default to current account only**
2. **Require explicit user consent for cross-account operations**
3. **Provide clear UI choices**
4. **Maintain detailed audit logs**
5. **Implement reversibility**

This aligns with:
- GDPR Article 17 (Right to Erasure)
- ISO 27001 (Information Security)
- SOC 2 Type II (Data Privacy)
- Industry best practices from Google, Microsoft, Meta