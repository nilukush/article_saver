# Contributing to Article Saver

Thank you for your interest in contributing to Article Saver! We welcome contributions from the community and are grateful for any help you can provide.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/article_saver.git
   cd article_saver
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/nilukush/article_saver.git
   ```
4. **Keep your fork updated**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

## 💻 Development Setup

### Prerequisites

- Node.js 18+ (20.x recommended)
- PostgreSQL 14+
- Git 2.x+
- Visual Studio Code (recommended)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run db:push
npm run dev
```

### Desktop Setup

```bash
cd desktop
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend
npm test
npm run test:watch  # Watch mode
npm run test:coverage  # Coverage report

# Desktop tests
cd desktop
npm test
```

## 🎯 How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - System information
   - Screenshots if applicable

### Suggesting Features

1. **Check the roadmap** and existing feature requests
2. **Create a feature request** with:
   - Use case description
   - Proposed solution
   - Alternative solutions considered
   - Additional context

### Code Contributions

1. **Find an issue** labeled `good first issue` or `help wanted`
2. **Comment on the issue** to claim it
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following our coding standards
5. **Write/update tests** for your changes
6. **Update documentation** if needed
7. **Commit your changes** using conventional commits

## 🔄 Pull Request Process

### Before Submitting

1. **Update your branch** with latest main:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all tests**:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

### Submitting a PR

1. **Push your branch** to your fork
2. **Create a Pull Request** with:
   - Descriptive title following conventional commits
   - Reference to related issue(s)
   - Description of changes
   - Screenshots for UI changes
   - Breaking changes noted

3. **PR Title Format**:
   ```
   feat: add dark mode toggle
   fix: resolve article extraction timeout
   docs: update API documentation
   chore: upgrade dependencies
   ```

### Review Process

- All PRs require 2 approvals
- CI checks must pass
- Code coverage must not decrease
- Reviewers may request changes
- Be responsive to feedback

### Project Structure

```
article_saver/
├── backend/                    # Express API
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Express middleware
│   │   ├── database/          # Prisma setup
│   │   └── utils/             # Helpers
│   ├── prisma/                # Database schema
│   └── scripts/               # Management scripts
├── desktop/                   # Electron app
│   ├── src/
│   │   ├── main/             # Main process
│   │   └── renderer/         # React app
│   └── release/              # Built packages
└── shared/                    # Shared types
```

## 📏 Coding Standards

### TypeScript

- Enable strict mode
- Use explicit types (avoid `any`)
- Prefer interfaces over type aliases
- Document complex types

```typescript
// Good
interface Article {
  id: string;
  title: string;
  content: string;
  savedAt: Date;
}

// Bad
type Article = any;
```

### React Components

- Use functional components with hooks
- Implement proper error boundaries
- Use meaningful component names
- Keep components focused and small

```typescript
// Good
export function ArticleCard({ article }: ArticleCardProps) {
  // Component logic
}

// Bad
export default function Component({ data }) {
  // Component logic
}
```

### Backend Code

- Use async/await over callbacks
- Implement proper error handling
- Add logging for important operations
- Use dependency injection

```typescript
// Good
export async function extractContent(url: string): Promise<ExtractedContent> {
  try {
    const response = await fetch(url);
    // Processing logic
    logger.info('Content extracted successfully', { url });
    return content;
  } catch (error) {
    logger.error('Content extraction failed', { url, error });
    throw new ContentExtractionError('Failed to extract content', { cause: error });
  }
}
```

### Database

- Use Prisma migrations
- Never use raw SQL in application code
- Add appropriate indexes
- Document schema changes

### Git Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve memory leak in article parser
docs: update installation instructions
style: format code with prettier
refactor: extract content service
test: add integration tests for auth
chore: update dependencies
```

## 🧪 Testing Guidelines

### Unit Tests

- Test individual functions/components
- Mock external dependencies
- Aim for 80%+ coverage
- Use descriptive test names

```typescript
describe('ArticleExtractor', () => {
  it('should extract content from valid HTML', async () => {
    // Test implementation
  });

  it('should handle missing content gracefully', async () => {
    // Test implementation
  });
});
```

### Integration Tests

- Test API endpoints
- Test database operations
- Use test database
- Clean up after tests

### E2E Tests

- Test critical user flows
- Run against production build
- Use realistic data
- Document test scenarios

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Include examples in comments
- Keep comments up-to-date

```typescript
/**
 * Extracts article content from a webpage using Mozilla Readability
 * @param url - The URL to extract content from
 * @param options - Extraction options
 * @returns Extracted article content
 * @throws {ContentExtractionError} If extraction fails
 * @example
 * const content = await extractArticle('https://example.com/article');
 */
export async function extractArticle(
  url: string, 
  options?: ExtractOptions
): Promise<Article> {
  // Implementation
}
```

### README Updates

- Update feature list
- Keep installation steps current
- Document new environment variables
- Add troubleshooting entries

### API Documentation

- Use OpenAPI/Swagger format
- Include request/response examples
- Document error responses
- Version API changes

## 🌟 Community

### Getting Help

- Check [Documentation](https://github.com/nilukush/article_saver/wiki)
- Search [existing issues](https://github.com/nilukush/article_saver/issues)
- Ask in [Discussions](https://github.com/nilukush/article_saver/discussions)
- Contact maintainers

### Recognition

Contributors will be:
- Listed in our [Contributors](https://github.com/nilukush/article_saver/graphs/contributors) page
- Mentioned in release notes
- Given credit in the README

## 🎉 Thank You!

Your contributions make Article Saver better for everyone. We appreciate your time and effort in improving this project!

---

<div align="center">
  <p>Happy coding! 🚀</p>
</div>
