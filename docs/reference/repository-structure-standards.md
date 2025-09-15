# Repository Structure Standards

## 🎯 **Core Organizational Principles**

Based on established information architecture principles and best practices from the knowledge base:

### **1. Shallow Hierarchies (Max 3 Levels)**

- Root directory: ≤15 essential files only
- Documentation: Max 3 categories (guides/, reference/, decisions/)
- Avoid deep nesting that harms discoverability

### **2. Stable, Machine-Friendly Naming**

- Lowercase, hyphen-separated names (no spaces)
- ISO 8601 date prefixes for temporal ordering: `2025-09-11-...`
- Use stable identifiers for projects and components

### **3. Separation of Concerns**

- Source code: `/src` organized by domain
- Configuration: `/config` organized by purpose  
- Documentation: `/docs` with clear categories
- Scripts/Tools: `/scripts` with TypeScript consistency
- Build artifacts: `/dist` (generated, not committed)

## 📁 **Directory Structure Standards**

### **Root Directory (Target: ≤15 files)**

```tree
├── README.md              # Project overview
├── LICENSE                # License file  
├── CONTRIBUTING.md        # Contribution guidelines
├── CODE_OF_CONDUCT.md    # Community standards
├── SECURITY.md           # Security policy
├── CHANGELOG.md          # Version history
├── package.json          # Node.js configuration
├── tsconfig.json         # TypeScript configuration
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Multi-container setup
├── .gitignore           # Git ignore rules
├── .env.example         # Environment template
├── src/                 # Source code
├── docs/                # Documentation (3 categories max)
├── scripts/             # Build and utility scripts (TypeScript)
├── config/              # Configuration files
└── .vscode/             # Editor configuration
```

### **Documentation Structure (/docs)**

```tree
docs/
├── guides/              # User-facing documentation
│   ├── getting-started.md
│   ├── installation.md  
│   ├── user-guide.md
│   ├── examples/
│   └── troubleshooting.md
├── reference/           # Technical specifications
│   ├── api-reference.md
│   ├── architecture.md
│   ├── tools-reference.md
│   └── performance.md
└── decisions/           # Design decisions and ADRs
    ├── adr-001-architecture.md
    ├── adr-002-tooling.md
    └── README.md
```

### **Configuration Organization (/config)**

```tree
config/
├── build/               # Build-related configuration
│   ├── eslint.config.js
│   ├── prettier.config.js
│   └── jest.config.js
├── development/         # Development environment
│   ├── vscode.json
│   └── husky.config.js
├── deployment/          # Deployment configuration
│   ├── docker.config.js
│   └── ci.config.js
└── quality/            # Code quality tools
    ├── lint-staged.config.js
    └── markdownlint.config.js
```

### **Scripts Organization (/scripts)**

```tree
scripts/
├── build/              # Build utilities (TypeScript only)
│   ├── compile.ts
│   ├── bundle.ts
│   └── fix-imports.ts
├── development/        # Development tools
│   ├── validate-structure.ts
│   ├── generate-docs.ts
│   └── check-quality.ts
├── deployment/         # Deployment automation
│   ├── deploy.ts
│   └── docker-build.ts
└── maintenance/        # Maintenance utilities
    ├── cleanup.ts
    └── audit.ts
```

## 🚫 **Prohibited Patterns**

### **Root Directory Violations**

- ❌ Configuration files scattered in root (`.eslintrc.json`, `.prettierrc.json`)
- ❌ Build utilities in root (`fix-*.js`, `test-*.js`)
- ❌ Essential files moved to subdirectories (`LICENSE`, `CONTRIBUTING.md`)
- ❌ More than 15 files in root directory

### **Documentation Anti-Patterns**

- ❌ More than 3 documentation categories
- ❌ Deep nesting (>3 levels) in docs/
- ❌ Mixed content types in same directory
- ❌ Empty or duplicate markdown files

### **Tooling Violations**

- ❌ JavaScript files in TypeScript project for build tools
- ❌ Inconsistent naming conventions
- ❌ Mixed file formats for similar purposes

## ✅ **Compliance Validation**

### **Automated Checks**

1. **Root Directory Count**: Must be ≤15 files
2. **Documentation Depth**: Must be ≤3 levels
3. **TypeScript Consistency**: All scripts must be `.ts` files
4. **Configuration Organization**: All configs in `/config`
5. **Essential Files Location**: Must be in root

### **Manual Review Points**

- File placement follows documented standards
- Naming conventions are consistent
- Cross-references are updated after moves
- Build processes still function correctly

## 🔄 **Migration Guidelines**

### **Safe Migration Steps**

1. **Document Current State**: Create inventory of all files
2. **Create Target Structure**: Prepare new directories
3. **Batch Move Related Files**: Move by category, not individually  
4. **Update Cross-References**: Fix all internal links
5. **Test Build Process**: Ensure functionality is preserved
6. **Validate Structure**: Run compliance checks

### **Rollback Strategy**

- Keep backup of original structure until validation complete
- Test all critical paths before committing changes
- Document any breaking changes in CHANGELOG.md

This standard ensures maintainable, discoverable, and scalable repository organization aligned with established best practices.
