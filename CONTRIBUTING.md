# Contributing to Article Saver

Thank you for your interest in contributing to Article Saver! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear description** of the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details**:
  - Operating System and version
  - Node.js version
  - Electron version
  - Application version

### Suggesting Features

Feature requests are welcome! Please:

- Check existing issues to avoid duplicates
- Clearly describe the feature and its benefits
- Explain why this feature would be useful to Article Saver users
- Consider the scope and complexity of the implementation

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `cd desktop && npm install`
3. **Make your changes** following our coding standards
4. **Test your changes** thoroughly
5. **Update documentation** if needed
6. **Commit your changes** with clear, descriptive messages
7. **Push to your fork** and submit a pull request

## 🛠️ Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Local Development

1. Clone your fork:
```bash
git clone https://github.com/yourusername/article-saver.git
cd article-saver
```

2. Install dependencies:
```bash
cd desktop
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Make your changes and test them

### Project Structure

```
article-saver/
├── desktop/                 # Main Electron application
│   ├── src/
│   │   ├── main/           # Electron main process
│   │   │   ├── database/   # File-based database logic
│   │   │   ├── services/   # Article extraction and processing
│   │   │   ├── main.ts     # Main process entry point
│   │   │   └── preload.ts  # Secure IPC bridge
│   │   └── renderer/       # React frontend
│   │       ├── components/ # React components
│   │       ├── stores/     # Zustand state management
│   │       └── App.tsx     # Main React application
│   ├── package.json        # Dependencies and scripts
│   └── vite.config.ts      # Vite configuration
├── shared/                 # Shared TypeScript types
│   └── types.ts           # Common type definitions
└── README.md
```

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Import types from `shared/types.ts` when applicable
- Avoid `any` types - use proper typing

### React Components

- Use functional components with hooks
- Follow React best practices
- Use Zustand for state management
- Keep components focused and reusable

### Styling

- Use Tailwind CSS for styling
- Follow the existing dark theme design
- Ensure responsive design principles
- Maintain consistency with existing UI patterns

### Code Organization

- Keep files focused on a single responsibility
- Use clear, descriptive names for functions and variables
- Add comments for complex logic
- Follow existing file and folder structure

### Electron Best Practices

- Use secure IPC communication patterns
- Follow the preload script approach for renderer-main communication
- Handle errors gracefully in both main and renderer processes
- Test on multiple platforms when possible

## 🧪 Testing

### Manual Testing

- Test your changes on your development environment
- Verify the application builds successfully: `npm run build`
- Test article saving and reading functionality
- Check search and tag features
- Ensure UI responsiveness

### Cross-Platform Considerations

- Article Saver supports macOS, Windows, and Linux
- Test on multiple platforms if possible
- Consider architecture differences (Intel vs Apple Silicon)
- Ensure file paths work across operating systems

## 📋 Commit Guidelines

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add article export functionality
fix: resolve search not working with special characters
docs: update installation instructions
style: improve article reader typography
refactor: simplify database service architecture
```

### Commit Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 🔍 Code Review Process

1. **Automated checks** must pass (linting, type checking)
2. **Manual review** by maintainers
3. **Testing** on different platforms if needed
4. **Approval** and merge by maintainers

### Review Criteria

- Code quality and adherence to standards
- Functionality and bug fixes
- Performance considerations
- Security implications
- Documentation updates
- Backward compatibility

## 🚀 Release Process

Releases are managed by maintainers and follow semantic versioning:

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Documentation**: Check README.md and code comments

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Special mentions for major features or fixes

## 📄 License

By contributing to Article Saver, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Article Saver! 🎉
