import { openDB, type IDBPDatabase } from "idb";

export interface FileNode {
  type: "file" | "dir";
  content?: string;
  data?: any;
  created: number;
  modified: number;
}

export interface FileTree {
  [key: string]: FileNode;
}

export class FileSystem {
  private db: IDBPDatabase | null = null;
  private fileTree: FileTree = {};
  private cwd: string = "/home/user";

  async init() {
    this.db = await openDB("prateek-shell-fs", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files");
        }
      },
    });

    // Load filesystem from IndexedDB
    const stored = await this.db.get("files", "tree");
    if (stored) {
      this.fileTree = stored;
    } else {
      // Initialize default filesystem
      await this.initializeDefaultFS();
    }
  }

  private async initializeDefaultFS() {
    const now = Date.now();

    // Create directory structure
    this.fileTree = {
      "/": { type: "dir", created: now, modified: now },
      "/home": { type: "dir", created: now, modified: now },
      "/home/user": { type: "dir", created: now, modified: now },
      "/home/user/profile.txt": {
        type: "file",
        content: "",
        created: now,
        modified: now,
      },
      "/home/user/projects.txt": {
        type: "file",
        content: "",
        created: now,
        modified: now,
      },
      "/home/user/education.txt": {
        type: "file",
        content: "",
        created: now,
        modified: now,
      },
      "/home/user/publications.txt": {
        type: "file",
        content: "",
        created: now,
        modified: now,
      },
      "/home/user/contact.txt": {
        type: "file",
        content: "",
        created: now,
        modified: now,
      },
      "/home/user/.secrets": {
        type: "file",
        content: "",
        created: now,
        modified: now,
      },
      "/home/user/post": { type: "dir", created: now, modified: now },
    };

    await this.save();
  }

  async save() {
    if (this.db) {
      await this.db.put("files", this.fileTree, "tree");
      await this.db.put("files", this.cwd, "cwd");
    }
  }

  async loadCwd() {
    if (this.db) {
      const stored = await this.db.get("files", "cwd");
      if (stored) {
        this.cwd = stored;
      }
    }
    return this.cwd;
  }

  // Path resolution
  resolvePath(path: string): string {
    if (path.startsWith("/")) {
      return this.normalizePath(path);
    }
    if (path === "~") {
      return "/home/user";
    }
    if (path.startsWith("~/")) {
      return this.normalizePath("/home/user/" + path.slice(2));
    }
    return this.normalizePath(this.cwd + "/" + path);
  }

  private normalizePath(path: string): string {
    const parts = path.split("/").filter((p) => p && p !== ".");
    const resolved: string[] = [];

    for (const part of parts) {
      if (part === "..") {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }

    return "/" + resolved.join("/");
  }

  // Get display path (convert /home/user to ~)
  getDisplayPath(path: string = this.cwd): string {
    if (path === "/home/user") return "~";
    if (path.startsWith("/home/user/")) {
      return "~/" + path.slice(11);
    }
    return path;
  }

  // File operations
  exists(path: string): boolean {
    const resolved = this.resolvePath(path);
    return resolved in this.fileTree;
  }

  isFile(path: string): boolean {
    const resolved = this.resolvePath(path);
    return this.fileTree[resolved]?.type === "file";
  }

  isDirectory(path: string): boolean {
    const resolved = this.resolvePath(path);
    return this.fileTree[resolved]?.type === "dir";
  }

  async readFile(path: string): Promise<string> {
    const resolved = this.resolvePath(path);
    const node = this.fileTree[resolved];

    if (!node) {
      throw new Error(`File not found: ${path}`);
    }
    if (node.type !== "file") {
      throw new Error(`Is a directory: ${path}`);
    }

    return node.content || "";
  }

  async writeFile(path: string, content: string, append: boolean = false) {
    const resolved = this.resolvePath(path);
    const node = this.fileTree[resolved];

    if (node && node.type === "dir") {
      throw new Error(`Is a directory: ${path}`);
    }

    const now = Date.now();

    if (node) {
      node.content = append ? (node.content || "") + content : content;
      node.modified = now;
    } else {
      this.fileTree[resolved] = {
        type: "file",
        content,
        created: now,
        modified: now,
      };
    }

    await this.save();
  }

  async mkdir(path: string, recursive: boolean = false) {
    const resolved = this.resolvePath(path);

    if (this.exists(resolved)) {
      throw new Error(`File exists: ${path}`);
    }

    const parts = resolved.split("/").filter(Boolean);
    const now = Date.now();

    if (recursive) {
      let current = "";
      for (const part of parts) {
        current += "/" + part;
        if (!this.exists(current)) {
          this.fileTree[current] = { type: "dir", created: now, modified: now };
        }
      }
    } else {
      const parent = "/" + parts.slice(0, -1).join("/");
      if (parent !== "/" && !this.isDirectory(parent)) {
        throw new Error(`No such file or directory: ${parent}`);
      }
      this.fileTree[resolved] = { type: "dir", created: now, modified: now };
    }

    await this.save();
  }

  async rm(path: string, recursive: boolean = false, force: boolean = false) {
    const resolved = this.resolvePath(path);

    if (!this.exists(resolved)) {
      if (!force) {
        throw new Error(`No such file or directory: ${path}`);
      }
      return;
    }

    const node = this.fileTree[resolved];
    if (!node) return;

    if (node.type === "dir") {
      if (!recursive) {
        throw new Error(`Is a directory: ${path}`);
      }

      // Remove all children
      const prefix = resolved === "/" ? "/" : resolved + "/";
      for (const key in this.fileTree) {
        if (key.startsWith(prefix)) {
          delete this.fileTree[key];
        }
      }
    }

    delete this.fileTree[resolved];
    await this.save();
  }

  async cp(source: string, dest: string, recursive: boolean = false) {
    const srcResolved = this.resolvePath(source);
    const destResolved = this.resolvePath(dest);

    if (!this.exists(srcResolved)) {
      throw new Error(`No such file or directory: ${source}`);
    }

    const srcNode = this.fileTree[srcResolved];
    if (!srcNode) return;

    if (srcNode.type === "dir" && !recursive) {
      throw new Error(`Is a directory: ${source} (use -r flag)`);
    }

    const now = Date.now();

    if (srcNode.type === "file") {
      const newNode: FileNode = {
        type: "file",
        created: now,
        modified: now,
      };
      if (srcNode.content !== undefined) newNode.content = srcNode.content;
      if (srcNode.data !== undefined) newNode.data = srcNode.data;
      this.fileTree[destResolved] = newNode;
    } else {
      // Copy directory recursively
      this.fileTree[destResolved] = {
        type: "dir",
        created: now,
        modified: now,
      };

      const prefix = srcResolved === "/" ? "/" : srcResolved + "/";
      for (const key in this.fileTree) {
        if (key.startsWith(prefix)) {
          const relativePath = key.slice(srcResolved.length);
          const newPath = destResolved + relativePath;
          const node = this.fileTree[key];

          if (node) {
            const newNode: FileNode = {
              type: node.type,
              created: now,
              modified: now,
            };
            if (node.content !== undefined) newNode.content = node.content;
            if (node.data !== undefined) newNode.data = node.data;
            this.fileTree[newPath] = newNode;
          }
        }
      }
    }

    await this.save();
  }

  async mv(source: string, dest: string) {
    await this.cp(source, dest, true);
    await this.rm(source, true, false);
  }

  async touch(path: string) {
    const resolved = this.resolvePath(path);
    const now = Date.now();

    if (this.exists(resolved)) {
      const node = this.fileTree[resolved];
      if (node && node.type === "file") {
        node.modified = now;
      } else {
        throw new Error(`Is a directory: ${path}`);
      }
    } else {
      this.fileTree[resolved] = {
        type: "file",
        content: "",
        created: now,
        modified: now,
      };
    }

    await this.save();
  }

  async rmdir(path: string) {
    const resolved = this.resolvePath(path);

    if (!this.exists(resolved)) {
      throw new Error(`No such file or directory: ${path}`);
    }

    if (!this.isDirectory(resolved)) {
      throw new Error(`Not a directory: ${path}`);
    }

    // Check if directory is empty
    const prefix = resolved === "/" ? "/" : resolved + "/";
    for (const key in this.fileTree) {
      if (key.startsWith(prefix) && key !== resolved) {
        throw new Error(`Directory not empty: ${path}`);
      }
    }

    delete this.fileTree[resolved];
    await this.save();
  }

  // Directory listing
  async ls(path: string = "."): Promise<string[]> {
    const resolved = this.resolvePath(path);

    if (!this.exists(resolved)) {
      throw new Error(`No such file or directory: ${path}`);
    }

    if (this.isFile(resolved)) {
      return [resolved.split("/").pop() || ""];
    }

    const prefix = resolved === "/" ? "/" : resolved + "/";
    const entries = new Set<string>();

    for (const key in this.fileTree) {
      if (key.startsWith(prefix) && key !== resolved) {
        const relative = key.slice(prefix.length);
        const firstPart = relative.split("/")[0];
        if (firstPart) {
          entries.add(firstPart);
        }
      }
    }

    return Array.from(entries).sort();
  }

  async lsLong(
    path: string = ".",
  ): Promise<
    Array<{ name: string; type: string; size: number; modified: Date }>
  > {
    const resolved = this.resolvePath(path);
    const entries = await this.ls(path);

    return entries.map((name) => {
      const fullPath = resolved === "/" ? "/" + name : resolved + "/" + name;
      const node = this.fileTree[fullPath];

      if (!node) {
        return {
          name,
          type: "unknown",
          size: 0,
          modified: new Date(),
        };
      }

      return {
        name,
        type: node.type,
        size: node.content?.length || 0,
        modified: new Date(node.modified),
      };
    });
  }

  // Change directory
  async cd(path: string) {
    const resolved = this.resolvePath(path);

    if (!this.exists(resolved)) {
      throw new Error(`No such file or directory: ${path}`);
    }

    if (!this.isDirectory(resolved)) {
      throw new Error(`Not a directory: ${path}`);
    }

    this.cwd = resolved;
    await this.save();
    return this.getDisplayPath(this.cwd);
  }

  pwd(): string {
    return this.getDisplayPath(this.cwd);
  }

  // Advanced operations
  async find(path: string, pattern: string): Promise<string[]> {
    const resolved = this.resolvePath(path);

    if (!this.exists(resolved)) {
      throw new Error(`No such file or directory: ${path}`);
    }

    const results: string[] = [];
    const regex = new RegExp(pattern.replace(/\*/g, ".*").replace(/\?/g, "."));
    const prefix = resolved === "/" ? "/" : resolved + "/";

    // Check the path itself
    const basename = resolved.split("/").pop() || "";
    if (regex.test(basename)) {
      results.push(this.getDisplayPath(resolved));
    }

    // Check children
    for (const key in this.fileTree) {
      if (key.startsWith(prefix)) {
        const name = key.split("/").pop() || "";
        if (regex.test(name)) {
          results.push(this.getDisplayPath(key));
        }
      }
    }

    return results;
  }

  async grep(
    pattern: string,
    path: string,
    recursive: boolean = false,
  ): Promise<Array<{ path: string; line: number; content: string }>> {
    const resolved = this.resolvePath(path);
    const results: Array<{ path: string; line: number; content: string }> = [];
    const regex = new RegExp(pattern);

    const searchFile = (filePath: string) => {
      const node = this.fileTree[filePath];
      if (node && node.type === "file" && node.content) {
        const lines = node.content.split("\n");
        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            results.push({
              path: this.getDisplayPath(filePath),
              line: idx + 1,
              content: line,
            });
          }
        });
      }
    };

    if (this.isFile(resolved)) {
      searchFile(resolved);
    } else if (this.isDirectory(resolved)) {
      const prefix = resolved === "/" ? "/" : resolved + "/";

      if (recursive) {
        for (const key in this.fileTree) {
          if (key.startsWith(prefix) && this.fileTree[key]?.type === "file") {
            searchFile(key);
          }
        }
      } else {
        const entries = await this.ls(resolved);
        for (const entry of entries) {
          const fullPath =
            resolved === "/" ? "/" + entry : resolved + "/" + entry;
          if (this.isFile(fullPath)) {
            searchFile(fullPath);
          }
        }
      }
    }

    return results;
  }

  async wc(
    path: string,
  ): Promise<{ lines: number; words: number; chars: number }> {
    const content = await this.readFile(path);
    const lines = content.split("\n").length;
    const words = content.split(/\s+/).filter(Boolean).length;
    const chars = content.length;

    return { lines, words, chars };
  }

  async head(path: string, lines: number = 10): Promise<string> {
    const content = await this.readFile(path);
    return content.split("\n").slice(0, lines).join("\n");
  }

  async tail(path: string, lines: number = 10): Promise<string> {
    const content = await this.readFile(path);
    const allLines = content.split("\n");
    return allLines.slice(-lines).join("\n");
  }

  async tree(path: string = ".", maxDepth: number = Infinity): Promise<string> {
    const resolved = this.resolvePath(path);

    if (!this.exists(resolved)) {
      throw new Error(`No such file or directory: ${path}`);
    }

    const lines: string[] = [];

    const buildTree = (
      currentPath: string,
      prefix: string = "",
      depth: number = 0,
    ) => {
      if (depth > maxDepth) return;

      const entries = Object.keys(this.fileTree)
        .filter((key) => {
          const parent = key.substring(0, key.lastIndexOf("/")) || "/";
          return parent === currentPath && key !== currentPath;
        })
        .sort();

      entries.forEach((key, idx) => {
        const isLast = idx === entries.length - 1;
        const name = key.split("/").pop() || "";
        const node = this.fileTree[key];
        if (!node) return;

        const marker = isLast ? "└── " : "├── ";
        const displayName = node.type === "dir" ? name + "/" : name;

        lines.push(prefix + marker + displayName);

        if (node.type === "dir") {
          const newPrefix = prefix + (isLast ? "    " : "│   ");
          buildTree(key, newPrefix, depth + 1);
        }
      });
    };

    lines.push(this.getDisplayPath(resolved) + "/");
    buildTree(resolved);

    return lines.join("\n");
  }

  // Set file data (for blog posts, etc.)
  setFileData(path: string, data: any) {
    const resolved = this.resolvePath(path);
    if (this.fileTree[resolved]) {
      this.fileTree[resolved].data = data;
    }
  }

  getFileData(path: string): any {
    const resolved = this.resolvePath(path);
    return this.fileTree[resolved]?.data;
  }

  // Get all paths (for autocomplete)
  getAllPaths(): string[] {
    return Object.keys(this.fileTree).map((p) => this.getDisplayPath(p));
  }

  // Get current working directory
  getCwd(): string {
    return this.cwd;
  }

  // Reset filesystem to default state
  async reset() {
    await this.initializeDefaultFS();
    this.cwd = "/home/user";
    await this.save();
  }
}
