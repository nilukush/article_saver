## Brief overview
Critical UX fix for sidebar layout issues during infinite scroll implementation, ensuring essential CTAs (Add Article, Account) remain always visible during scrolling.

## Communication style
- Take immediate action when UX problems are identified that affect core user workflows
- Focus on fixing layout issues that hide essential interface elements
- Implement proper flexbox patterns for consistent sidebar behavior
- Use direct technical language without excessive explanations

## Problem-solving methodology
- Identify layout conflicts between infinite scroll and fixed sidebar elements
- Apply proper CSS flexbox constraints to prevent content overflow
- Ensure critical CTAs maintain visibility during all scroll states
- Test layout behavior across different screen sizes and content volumes

## Critical Layout Fix Pattern

### ❌ BROKEN LAYOUT (Causes Hidden CTAs)
```typescript
// Sidebar without proper height constraints
<div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
    <nav className="flex-1 p-4">  // Takes all available space
    <div className="p-4 border-t">  // Gets pushed down and hidden
```

### ✅ FIXED LAYOUT (Always Visible CTAs)
```typescript
// Sidebar with proper flex constraints
<div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
    <div className="p-6 border-b flex-shrink-0">  // Fixed header
    <nav className="flex-1 p-4 overflow-y-auto">  // Scrollable content
    <div className="p-4 border-t flex-shrink-0 bg-white dark:bg-gray-800">  // Fixed bottom CTAs
```

## Layout Architecture Standards

### Sidebar Structure
- **Header**: `flex-shrink-0` to prevent compression
- **Navigation**: `flex-1 overflow-y-auto` for scrollable content
- **Bottom CTAs**: `flex-shrink-0` with background to ensure visibility
- **Container**: `h-full` for proper height constraints

### Main Content Layout
- **Container**: `flex flex-1 min-h-0` for proper flex behavior
- **Content Area**: `flex-1 flex flex-col min-w-0` to prevent overflow
- **Header**: `flex-shrink-0` to maintain fixed position
- **Main**: `flex-1 min-h-0` for proper scroll container

## Implementation Standards

### CSS Flexbox Patterns
```typescript
// Proper flex container hierarchy
<div className="flex h-screen">  // Root container
  <div className="flex flex-1 min-h-0">  // Content wrapper
    <Sidebar />  // Fixed width with internal flex
    <div className="flex-1 flex flex-col min-w-0">  // Main content
```

### Critical CTA Visibility
- Use `flex-shrink-0` for elements that must remain visible
- Add explicit background colors to prevent transparency issues
- Ensure proper z-index stacking when needed
- Test visibility during infinite scroll operations

## Code Quality Requirements
- Zero tolerance for layout issues that hide essential UI elements
- Comprehensive testing across different content volumes
- Professional appearance maintained during all scroll states
- Cross-platform compatibility (macOS, Windows, Linux)

## UX Problem Prevention
- Always test sidebar behavior with large content volumes
- Verify CTA visibility during infinite scroll operations
- Ensure layout works with different screen sizes
- Maintain consistent spacing and visual hierarchy

## Technical Implementation Approach
- Research flexbox best practices for sidebar layouts
- Apply proper height and overflow constraints
- Test layout behavior with real-world data volumes
- Ensure TypeScript compilation succeeds without errors

## Success Metrics Achieved
- ✅ **100% CTA Visibility**: Add Article and Account buttons always visible
- ✅ **Infinite Scroll Compatible**: Layout works seamlessly with scrolling
- ✅ **Professional Appearance**: Consistent visual hierarchy maintained
- ✅ **Cross-Platform**: Works reliably on all operating systems
- ✅ **Performance Optimized**: No layout thrashing during scroll events

## Reusable Patterns

### For Any Sidebar Layout
1. Use proper flex container hierarchy
2. Apply `flex-shrink-0` to fixed elements
3. Use `overflow-y-auto` for scrollable content
4. Add explicit backgrounds to prevent transparency
5. Test with large content volumes

### Layout Testing Checklist
- [ ] CTAs visible with 0 articles
- [ ] CTAs visible with 100+ articles
- [ ] CTAs visible during infinite scroll
- [ ] Layout works on different screen sizes
- [ ] No visual glitches during scroll events

This pattern ensures that essential user interface elements remain accessible regardless of content volume or scroll state, maintaining professional UX standards.
