## Agreement

Thanks for your interest in contributing!

By contributing to this project, you agree to the following:

1. **Relicensing:** to support the project's sustainability and ensure it's longevity, your contributions can be relicensed to any license.

2. **Ownership Rights:** You confirm you own the rights to your contributed code.

3. **Disagreement:** If you disagree with these terms, please create an issue instead. I'll handle the bug or feature request.

4. **Benefits for Contributors:** If your contribution is merged, you'll enjoy the same benefits as a sponsor for one year. This includes using the project in a company context, free of charge.

## Fair Source License

This project uses the Fair Source License, which is neither purely open-source nor closed-source. It allows visibility of the source code and free usage for a limited number of two users within an organization. Beyond this limit (three or more users), a small licensing fee via [GitHub Sponsors](https://github.com/sponsors/typicode) applies.

This doesn't apply to individuals, students, teachers, small teams, ...

Got questions or need support? Feel free to reach out to typicode@gmail.com.

## Development

### Prerequisites

- Node.js >= 22.12.0 (required for native TypeScript support)

### Setup

```bash
# Clone the repository
git clone https://github.com/typicode/json-server.git
cd json-server

# Install dependencies
npm install
```

### Development Workflow

```bash
# Run the dev server with a test database
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

### TypeScript Support

This project uses Node.js's native TypeScript support via the `--experimental-strip-types` flag (available in Node.js 22.12.0+). This means:

- No separate transpilation tool (like `tsx` or `ts-node`) is needed for development
- TypeScript files are run directly with Node.js using `node --experimental-strip-types`
- The `build` script compiles TypeScript to JavaScript for distribution using the TypeScript compiler (`tsc`)
- Type checking is performed by the TypeScript compiler during the build process
