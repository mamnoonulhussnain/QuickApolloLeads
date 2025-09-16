import { Octokit } from '@octokit/rest'
import fs from 'fs'
import path from 'path'

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function getAllFiles(dir, baseDir = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(baseDir, entry.name);
    
    // Skip certain directories and files
    if (entry.name.startsWith('.') && !entry.name.includes('gitignore')) continue;
    if (entry.name === 'node_modules') continue;
    if (entry.name === 'dist') continue;
    if (entry.name === '.cache') continue;
    if (entry.name === '.upm') continue;
    if (entry.name === '.config') continue;
    if (entry.name === '.local') continue;
    
    if (entry.isDirectory()) {
      files.push(...await getAllFiles(fullPath, relativePath));
    } else {
      // Read file content
      const content = fs.readFileSync(fullPath, 'utf8');
      files.push({
        path: relativePath.replace(/\\/g, '/'), // Ensure forward slashes
        content: content
      });
    }
  }
  
  return files;
}

async function pushToGitHub() {
  try {
    console.log('🔌 Connecting to GitHub...');
    const octokit = await getUncachableGitHubClient();
    
    // Get user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`👋 Authenticated as: ${user.login}`);
    
    const repoName = 'QuickApolloLeads';
    
    // Check if repository exists
    let repo;
    try {
      const { data: existingRepo } = await octokit.rest.repos.get({
        owner: user.login,
        repo: repoName
      });
      repo = existingRepo;
      console.log(`📁 Found existing repository: ${repo.full_name}`);
    } catch (error) {
      if (error.status === 404) {
        // Create new repository
        console.log('📁 Creating new repository...');
        const { data: newRepo } = await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          description: 'QuickApolloLeads - Affiliate commission management system with automatic monthly billing',
          private: false,
          auto_init: false
        });
        repo = newRepo;
        console.log(`✅ Created repository: ${repo.full_name}`);
      } else {
        throw error;
      }
    }
    
    // Get all files
    console.log('📂 Reading project files...');
    const files = await getAllFiles('.');
    console.log(`📄 Found ${files.length} files to upload`);
    
    // Get the latest commit SHA (if any)
    let latestCommitSha;
    try {
      const { data: ref } = await octokit.rest.git.getRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main'
      });
      latestCommitSha = ref.object.sha;
      console.log(`🔍 Found existing main branch with commit: ${latestCommitSha.substring(0, 7)}`);
    } catch (error) {
      if (error.status === 404 || error.status === 409) {
        console.log('🌱 No existing main branch found, will create initial commit');
        latestCommitSha = null;
      } else {
        throw error;
      }
    }
    
    // For empty repositories, use contents API to create initial file
    if (!latestCommitSha) {
      console.log('🌱 Creating initial commit in empty repository...');
      
      // Create README first to initialize the repository
      const readmeContent = `# QuickApolloLeads

## Overview
QuickApolloLeads is a comprehensive affiliate commission management system with automated monthly billing capabilities.

## Features
- 🔄 Automatic commission grouping by earning month (1st-31st)  
- 💰 Bulk payment processing by 5th of following month
- 📧 Complete email notification system
- 💳 Stripe payment integration with 15% commission rate
- 🔐 Secure authentication and session management
- 📊 Real-time order tracking and fulfillment dashboard

## Recent Updates
- Fixed React JSX and TypeScript errors in affiliate components
- Implemented automatic commission grouping by earning month
- Added bulk payment processing capabilities
- Resolved database array operations using inArray() instead of ANY()
- Fixed date formatting to display proper month names
- Synchronized database schema between development and production
- Integrated comprehensive email notification system

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Payments**: Stripe
- **Authentication**: Passport.js + bcrypt
- **Email**: PostMark SMTP

## Getting Started
\`\`\`bash
npm install
npm run db:push
npm run dev
\`\`\`

Built with ❤️ for efficient affiliate commission management.`;

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: repoName,
        path: 'README.md',
        message: '🌱 Initial commit: Add README',
        content: Buffer.from(readmeContent).toString('base64')
      });
      
      console.log('✅ Created initial README.md');
      
      // Now get the latest commit SHA for the tree operations
      const { data: ref } = await octokit.rest.git.getRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main'
      });
      latestCommitSha = ref.object.sha;
    }
    
    // Now create blobs and tree for all files
    console.log('⬆️  Uploading files...');
    const tree = [];
    
    for (const file of files) {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner: user.login,
        repo: repoName,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64'
      });
      
      tree.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });
    }
    
    // Create tree
    const { data: treeData } = await octokit.rest.git.createTree({
      owner: user.login,
      repo: repoName,
      tree: tree,
      base_tree: latestCommitSha
    });
    
    // Create commit
    const commitMessage = `🚀 Deploy affiliate commission system with automated monthly billing

- Fixed React JSX and TypeScript errors in affiliate components
- Implemented automatic commission grouping by earning month (1st-31st)
- Added bulk payment processing by 5th of following month
- Resolved database array operations using inArray() instead of ANY()
- Fixed date formatting to display proper month names
- Synchronized database schema between development and production environments
- Integrated Stripe payment processing with 15% commission rate
- Complete email notification system for all commission events`;

    const { data: commit } = await octokit.rest.git.createCommit({
      owner: user.login,
      repo: repoName,
      message: commitMessage,
      tree: treeData.sha,
      parents: [latestCommitSha]
    });
    
    // Update the main branch reference
    await octokit.rest.git.updateRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
      sha: commit.sha
    });
    console.log(`✅ Updated main branch to commit: ${commit.sha.substring(0, 7)}`);
    
    console.log(`🎉 Successfully pushed code to GitHub!`);
    console.log(`🔗 Repository URL: ${repo.html_url}`);
    
    return {
      success: true,
      repoUrl: repo.html_url,
      commitSha: commit.sha
    };
    
  } catch (error) {
    console.error('❌ Error pushing to GitHub:', error.message);
    throw error;
  }
}

// Run the push
pushToGitHub()
  .then(result => {
    console.log('✨ Push completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Push failed:', error);
    process.exit(1);
  });